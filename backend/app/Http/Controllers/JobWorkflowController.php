<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Job;
use App\Models\JobApplication;
use App\Notifications\JobStatusNotification;
use App\Services\Invoices\InvoiceFinalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class JobWorkflowController extends Controller
{
    public function accept(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isDriver() && !$user->isAdmin())) {
            abort(403, 'Only drivers can apply for jobs.');
        }

        if ($job->assigned_to_id) {
            abort(422, 'Job has already been assigned.');
        }

        $application = JobApplication::updateOrCreate(
            [
                'job_id' => $job->id,
                'driver_id' => $user->id,
            ],
            [
                'status' => 'pending',
                'message' => $request->filled('message')
                    ? $request->string('message')->toString()
                    : null,
                'responded_at' => null,
            ]
        );

        return response()->json([
            'message' => 'Application submitted. Waiting for dealer approval.',
            'application' => $application,
        ], 202);
    }

    public function collected(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $job->update([
            'status' => 'collected'
        ]);

        return response()->json($job);
    }

    public function delivered(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $job->update([
            'status' => 'delivered'
        ]);

        $this->notifyDealer($job->fresh(), 'driver_marked_delivered');

        return response()->json($job);
    }

    public function cancel(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($user->isAdmin() || $job->posted_by_id === $user->id) {
            $assigned = $job->assignedTo;

            $job->update([
                'status' => 'cancelled',
                'assigned_to_id' => null
            ]);

            if ($assigned) {
                Notification::send($assigned, new JobStatusNotification($job, 'dealer_cancelled_job', [
                    'reason' => $validated['reason'] ?? null,
                ]));
            }

            return response()->json($job);
        }

        if ($job->assigned_to_id !== $user->id) {
            abort(403, 'You cannot cancel this job.');
        }

        if (in_array(strtolower((string) $job->status), ['completed', 'delivered', 'closed'], true)) {
            abort(422, 'Completed jobs cannot be cancelled.');
        }

        if ($job->delivery_proof_path) {
            $this->deleteProof($job);
        }

        $job->update([
            'status' => 'open',
            'assigned_to_id' => null,
            'completion_status' => 'not_submitted',
            'completion_submitted_at' => null,
            'completion_notes' => null,
            'completion_approved_at' => null,
            'completion_rejected_at' => null,
            'delivery_proof_path' => null,
            'delivery_proof_disk' => null,
        ]);

        JobApplication::query()
            ->where('job_id', $job->id)
            ->where('driver_id', $user->id)
            ->update([
                'status' => 'withdrawn',
                'responded_at' => now(),
            ]);

        $this->notifyDealer($job->fresh(), 'driver_cancelled_job', [
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json($job);
    }

    public function complete(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'Only the assigned driver can submit completion.');
        }

        if ($job->finalized_invoice_id) {
            abort(422, 'This job has already been finalized.');
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:' . config('invoices.proof_max_size_kb')],
        ]);

        $proofDisk = config('invoices.proof_disk');
        $file = $request->file('proof');
        $directory = sprintf('jobs/%d/proof', $job->id);
        $extension = $file->getClientOriginalExtension() ?: 'pdf';
        $filename = sprintf('%s-%s.%s', now()->format('YmdHis'), Str::ulid(), $extension);
        $path = $file->storeAs($directory, $filename, $proofDisk);

        if ($job->delivery_proof_path) {
            $this->deleteProof($job);
        }

        $job->update([
            'status' => 'completion_pending',
            'completion_status' => 'submitted',
            'completion_submitted_at' => now(),
            'completion_notes' => $validated['notes'] ?? null,
            'delivery_proof_path' => $path,
            'delivery_proof_disk' => $proofDisk,
        ]);

        $this->notifyDealer($job->fresh(), 'driver_submitted_completion', [
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($job->fresh());
    }

    public function approveCompletion(Request $request, Job $job, InvoiceFinalizer $finalizer): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the posting dealer can approve completion.');
        }

        if ($job->completion_status !== 'submitted') {
            abort(422, 'Completion has not been submitted or was already handled.');
        }

        if (!$job->delivery_proof_path) {
            abort(422, 'Delivery proof is required before approval.');
        }

        $job->loadMissing(['expenses']);
        $invoice = $finalizer->finalize($job, $user);

        return response()->json([
            'message' => 'Job completion approved and invoice generated.',
            'invoice' => $this->summariseInvoice($invoice),
        ]);
    }

    public function rejectCompletion(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the posting dealer can reject completion.');
        }

        if ($job->completion_status !== 'submitted') {
            abort(422, 'There is no submitted completion to reject.');
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $job->update([
            'status' => 'in_progress',
            'completion_status' => 'rejected',
            'completion_rejected_at' => now(),
            'completion_notes' => $validated['reason'] ?? $job->completion_notes,
        ]);

        return response()->json($job->fresh());
    }

    public function deliveryProof(Request $request, Job $job)
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if (!$user->isAdmin() && $job->posted_by_id !== $user->id && $job->assigned_to_id !== $user->id) {
            abort(403, 'You cannot view this proof.');
        }

        if (!$job->delivery_proof_path) {
            abort(404, 'No delivery proof uploaded.');
        }

        $disk = $job->delivery_proof_disk ?? config('invoices.proof_disk');
        $storage = Storage::disk($disk);
        if (!$storage->exists($job->delivery_proof_path)) {
            abort(404, 'Proof file not found.');
        }

        $extension = pathinfo($job->delivery_proof_path, PATHINFO_EXTENSION) ?: 'pdf';
        $filename = sprintf('job-%d-proof.%s', $job->id, $extension);

        return $storage->response($job->delivery_proof_path, $filename, [], 'inline');
    }

    protected function deleteProof(Job $job): void
    {
        if (!$job->delivery_proof_path) {
            return;
        }

        $disk = $job->delivery_proof_disk ?? config('invoices.proof_disk');
        $storage = Storage::disk($disk);
        if ($storage->exists($job->delivery_proof_path)) {
            $storage->delete($job->delivery_proof_path);
        }
    }

    protected function notifyDealer(Job $job, string $event, ?array $meta = null): void
    {
        $job->loadMissing(['postedBy:id,name']);
        if (!$job->postedBy) {
            return;
        }

        Notification::send($job->postedBy, new JobStatusNotification($job, $event, $meta));
    }

    protected function summariseInvoice(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'number' => $invoice->number,
            'status' => $invoice->status,
            'currency' => $invoice->currency,
            'total' => $invoice->total,
            'issued_at' => $invoice->issued_at,
            'finalized_at' => $invoice->finalized_at,
        ];
    }
}
