<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Job;
use App\Services\Invoices\InvoiceFinalizer;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    public function __construct(
        protected InvoiceFinalizer $invoiceFinalizer
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $invoices = Invoice::query()
            ->with(['job:id,title,posted_by_id,assigned_to_id'])
            ->when(!$user || !$user->isAdmin(), function ($query) use ($user) {
                $query->whereHas('job', function ($child) use ($user) {
                    $child->where('posted_by_id', $user->id)
                        ->orWhere('assigned_to_id', $user->id);
                });
            })
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn (Invoice $invoice) => $this->transformInvoice($invoice));

        return response()->json(['data' => $invoices->values()]);
    }

    public function sendFromJob(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'Only the assigned driver or admin can send this invoice.');
        }

        if ($job->finalized_invoice_id) {
            $invoice = $job->finalizedInvoice()->with('items')->first() ?? $job->finalizedInvoice;
            if ($invoice) {
                $invoice->loadMissing(['job:id,title,posted_by_id,assigned_to_id']);
            }
            if (!$invoice) {
                abort(404, 'Invoice record missing for this job.');
            }

            return response()->json([
                'message' => 'Invoice already sent for this job.',
                'invoice' => $this->transformInvoice($invoice, true),
            ]);
        }

        if ($job->completion_status !== 'submitted') {
            abort(422, 'Submit completion for this job before sending an invoice.');
        }

        if (!$job->delivery_proof_path) {
            abort(422, 'Upload delivery proof before sending an invoice.');
        }

        $job->loadMissing(['expenses', 'postedBy', 'assignedTo']);
        $invoice = $this->invoiceFinalizer->finalize($job, $user);
        $invoice->loadMissing(['job:id,title,posted_by_id,assigned_to_id', 'items']);

        return response()->json([
            'message' => 'Invoice sent to the dealer.',
            'invoice' => $this->transformInvoice($invoice, true),
        ], 201);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $user = $request->user();
        $this->assertCanView($user, $invoice);

        $invoice->load([
            'job:id,title,posted_by_id,assigned_to_id,completed_at',
            'job.postedBy:id,name,email',
            'job.assignedTo:id,name,email',
            'items',
        ]);

        return response()->json(['data' => $this->transformInvoice($invoice, true)]);
    }

    public function download(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        $this->assertCanView($user, $invoice);

        if (!$invoice->pdf_path) {
            abort(404, 'PDF not available for this invoice.');
        }

        $disk = $invoice->pdf_disk ?? config('invoices.invoice_disk');
        $storage = Storage::disk($disk);

        if (!$storage->exists($invoice->pdf_path)) {
            abort(404, 'Stored PDF could not be found.');
        }

        $filename = sprintf('%s.pdf', $invoice->number ?? 'invoice');

        return $storage->response($invoice->pdf_path, $filename, [], 'inline');
    }

    public function verify(Request $request, Invoice $invoice): JsonResponse
    {
        $user = $request->user();
        $this->assertCanView($user, $invoice);

        $disk = $invoice->pdf_disk ?? config('invoices.invoice_disk');
        $storage = Storage::disk($disk);

        if (!$invoice->pdf_path || !$invoice->pdf_hash || !$storage->exists($invoice->pdf_path)) {
            return response()->json([
                'verified' => false,
                'reason' => 'missing',
            ]);
        }

        $hash = hash('sha256', $storage->get($invoice->pdf_path));

        return response()->json([
            'verified' => hash_equals($invoice->pdf_hash, $hash),
            'stored_hash' => $invoice->pdf_hash,
            'computed_hash' => $hash,
        ]);
    }

    protected function transformInvoice(Invoice $invoice, bool $withItems = false): array
    {
        $payload = [
            'id' => $invoice->id,
            'number' => $invoice->number,
            'status' => $invoice->status,
            'currency' => $invoice->currency,
            'subtotal' => $invoice->subtotal,
            'vat_total' => $invoice->vat_total,
            'total' => $invoice->total,
            'issued_at' => $invoice->issued_at,
            'finalized_at' => $invoice->finalized_at,
            'job' => $invoice->job ? [
                'id' => $invoice->job->id,
                'title' => $invoice->job->title,
            ] : null,
            'pdf_available' => (bool) $invoice->pdf_path,
            'pdf_hash' => $invoice->pdf_hash,
        ];

        if ($withItems) {
            $payload['items'] = $invoice->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => $item->type,
                    'description' => $item->description,
                    'amount' => $item->amount,
                    'vat_rate' => $item->vat_rate,
                    'vat_amount' => $item->vat_amount,
                    'total' => $item->total,
                    'source_type' => $item->source_type,
                    'source_id' => $item->source_id,
                ];
            })->values();
        }

        return $payload;
    }

    protected function assertCanView(?Authenticatable $user, Invoice $invoice): void
    {
        if (!$user) {
            abort(401);
        }

        if ($user->isAdmin()) {
            return;
        }

        $invoice->loadMissing('job');

        if ($invoice->job && ($invoice->job->posted_by_id === $user->id || $invoice->job->assigned_to_id === $user->id)) {
            return;
        }

        abort(403, 'You cannot access this invoice.');
    }
}
