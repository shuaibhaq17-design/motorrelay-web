<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Job;
use App\Notifications\ExpenseReviewedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExpenseController extends Controller
{
    public function index(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        $this->assertCanView($user, $job);

        $expenses = $job->expenses()
            ->with(['driver:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Expense $expense) => $this->transformExpense($expense));

        return response()->json(['data' => $expenses]);
    }

    public function store(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        $this->assertDriverCanMutate($user, $job);

        $validated = $this->validatePayload($request);

        $receiptData = $this->handleReceiptUpload($request, $job);
        $vatRate = $validated['vat_rate'] ?? config('invoices.default_vat_rate');

        $expense = DB::transaction(function () use ($job, $user, $validated, $receiptData, $vatRate) {
            $expense = Expense::create([
                'job_id' => $job->id,
                'driver_id' => $user->id,
                'description' => $validated['description'],
                'amount' => $validated['amount'],
                'vat_rate' => $vatRate,
                'receipt_path' => $receiptData['path'] ?? null,
                'receipt_disk' => $receiptData['disk'] ?? null,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]);

            return $expense->fresh(['driver:id,name']);
        });

        return response()->json($this->transformExpense($expense), 201);
    }

    public function update(Request $request, Job $job, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->assertDriverCanMutate($user, $job, $expense);

        if ($expense->job_id !== $job->id) {
            abort(404);
        }

        $validated = $this->validatePayload($request, true);

        $receiptData = $this->handleReceiptUpload($request, $job, $expense);
        $updatedVatRate = $validated['vat_rate'] ?? $expense->vat_rate;

        $expense = DB::transaction(function () use ($expense, $validated, $receiptData, $updatedVatRate) {
            $expense->fill(array_filter([
                'description' => $validated['description'] ?? null,
                'amount' => $validated['amount'] ?? null,
                'vat_rate' => $updatedVatRate,
                'receipt_path' => $receiptData['path'] ?? null,
                'receipt_disk' => $receiptData['disk'] ?? null,
            ], fn ($value) => $value !== null));

            $expense->save();

            return $expense->fresh(['driver:id,name', 'reviewer:id,name']);
        });

        return response()->json($this->transformExpense($expense));
    }

    public function destroy(Request $request, Job $job, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->assertDriverCanMutate($user, $job, $expense);

        if ($expense->job_id !== $job->id) {
            abort(404);
        }

        $this->deleteReceiptIfExists($expense);
        $expense->delete();

        return response()->noContent();
    }

    public function decide(Request $request, Job $job, Expense $expense): JsonResponse
    {
        $user = $request->user();
        $this->assertDealerCanReview($user, $job);

        if ($expense->job_id !== $job->id) {
            abort(404);
        }

        if ($expense->status !== 'submitted') {
            abort(422, 'Only submitted expenses can be reviewed.');
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $decision = $validated['decision'];
        $note = $validated['note'] ?? null;

        $expense = DB::transaction(function () use ($expense, $user, $decision, $note) {
            $expense->update([
                'status' => $decision,
                'review_note' => $note,
                'reviewed_by_id' => $user->id,
                'reviewed_at' => now(),
                'locked_at' => now(),
            ]);

            $fresh = $expense->fresh(['driver:id,name,email', 'reviewer:id,name']);

            DB::afterCommit(function () use ($fresh) {
                if ($fresh->driver) {
                    Notification::send($fresh->driver, new ExpenseReviewedNotification($fresh));
                }
            });

            return $fresh;
        });

        return response()->json($this->transformExpense($expense));
    }

    public function receipt(Request $request, Job $job, Expense $expense)
    {
        $user = $request->user();
        $this->assertCanView($user, $job);

        if ($expense->job_id !== $job->id || !$expense->receipt_path) {
            abort(404);
        }

        $disk = $expense->receipt_disk ?? config('invoices.receipt_disk');
        $adapter = Storage::disk($disk);

        if (!$adapter->exists($expense->receipt_path)) {
            abort(404);
        }

        $extension = pathinfo($expense->receipt_path, PATHINFO_EXTENSION) ?: 'pdf';
        $filename = Str::of($expense->description)->slug('-') . "-receipt.{$extension}";

        return $adapter->response($expense->receipt_path, (string) $filename, [], 'inline');
    }

    protected function validatePayload(Request $request, bool $partial = false): array
    {
        $rules = [
            'description' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'amount' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'vat_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'receipt' => [$partial ? 'nullable' : 'sometimes', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:' . config('invoices.receipt_max_size_kb')],
        ];

        return $request->validate($rules);
    }

    protected function handleReceiptUpload(Request $request, Job $job, ?Expense $expense = null): array
    {
        if (!$request->hasFile('receipt')) {
            return [];
        }

        $file = $request->file('receipt');
        $disk = config('invoices.receipt_disk');
        $directory = sprintf('jobs/%d/expenses', $job->id);
        $extension = $file->getClientOriginalExtension() ?: 'pdf';
        $filename = sprintf('%s-%s.%s', now()->format('YmdHis'), Str::ulid(), $extension);
        $path = $file->storeAs($directory, $filename, $disk);

        if ($expense) {
            $this->deleteReceiptIfExists($expense);
        }

        return [
            'disk' => $disk,
            'path' => $path,
        ];
    }

    protected function deleteReceiptIfExists(Expense $expense): void
    {
        if (!$expense->receipt_path) {
            return;
        }

        $disk = $expense->receipt_disk ?? config('invoices.receipt_disk');
        $adapter = Storage::disk($disk);
        if ($adapter->exists($expense->receipt_path)) {
            $adapter->delete($expense->receipt_path);
        }
    }

    protected function assertCanView($user, Job $job): void
    {
        if (!$user) {
            abort(401);
        }

        if ($user->isAdmin()) {
            return;
        }

        if ($job->posted_by_id === $user->id || $job->assigned_to_id === $user->id) {
            return;
        }

        abort(403, 'You cannot access expenses for this job.');
    }

    protected function assertDriverCanMutate($user, Job $job, ?Expense $expense = null): void
    {
        $this->assertCanView($user, $job);

        if (!$user->isDriver() && !$user->isAdmin()) {
            abort(403, 'Only drivers can create expenses.');
        }

        if ($user->isDriver() && $job->assigned_to_id !== $user->id) {
            abort(403, 'You are not assigned to this job.');
        }

        if ($job->finalized_invoice_id) {
            abort(422, 'Expenses cannot be changed after the invoice has been finalized.');
        }

        $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
        if (!$expense && $planSlug === 'starter' && !$user->isAdmin()) {
            $limit = config('jobs.plan_limits.starter.max_expenses_per_job', 0);
            if ($limit) {
                $existingExpenses = $job->expenses()
                    ->where('driver_id', $user->id)
                    ->count();

                if ($existingExpenses >= $limit) {
                    abort(422, sprintf(
                        'Starter plan allows up to %d expense uploads per job. Upgrade to track additional receipts.',
                        $limit
                    ));
                }
            }
        }

        if ($expense) {
            if ($expense->driver_id !== $user->id && !$user->isAdmin()) {
                abort(403, 'You cannot edit this expense.');
            }

            if (!$expense->is_editable) {
                abort(422, 'This expense is locked and cannot be modified.');
            }
        }
    }

    protected function assertDealerCanReview($user, Job $job): void
    {
        if (!$user) {
            abort(401);
        }

        if ($user->isAdmin()) {
            return;
        }

        if ($user->isDealer() && $job->posted_by_id === $user->id) {
            return;
        }

        abort(403, 'Only the posting dealer can review expenses for this job.');
    }

    protected function transformExpense(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'job_id' => $expense->job_id,
            'driver_id' => $expense->driver_id,
            'description' => $expense->description,
            'amount' => $expense->amount,
            'vat_rate' => $expense->vat_rate,
            'vat_amount' => $expense->vat_amount,
            'total_amount' => $expense->total_amount,
            'status' => $expense->status,
            'receipt_path' => $expense->receipt_path,
            'receipt_disk' => $expense->receipt_disk,
            'submitted_at' => $expense->submitted_at,
            'reviewed_at' => $expense->reviewed_at,
            'locked_at' => $expense->locked_at,
            'review_note' => $expense->review_note,
            'driver' => $expense->driver ? [
                'id' => $expense->driver->id,
                'name' => $expense->driver->name,
            ] : null,
            'reviewer' => $expense->reviewer ? [
                'id' => $expense->reviewer->id,
                'name' => $expense->reviewer->name,
            ] : null,
            'is_editable' => $expense->is_editable,
        ];
    }
}
