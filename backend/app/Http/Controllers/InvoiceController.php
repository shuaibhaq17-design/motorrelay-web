<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $invoices = Invoice::query()
            ->with(['job:id,title,posted_by_id,assigned_to_id'])
            ->when(!$user->isAdmin(), function ($query) use ($user) {
                $query->whereHas('job', function ($child) use ($user) {
                    $child->where('posted_by_id', $user->id)
                        ->orWhere('assigned_to_id', $user->id);
                });
            })
            ->orderByDesc('issued_at')
            ->get()
            ->map(function (Invoice $invoice) {
                return [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'status' => $invoice->status,
                    'total' => $invoice->total,
                    'issued_at' => $invoice->issued_at,
                    'job_ref' => $invoice->job?->title ?? $invoice->job?->id,
                ];
            });

        return response()->json(['data' => $invoices]);
    }

    public function storeFromJob(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin() && $job->assigned_to_id !== $user->id) {
            abort(403, 'Only the assigned driver or admin can invoice this job.');
        }

        $invoice = Invoice::create([
            'job_id' => $job->id,
            'number' => $this->generateInvoiceNumber(),
            'status' => 'sent',
            'total' => $job->price,
            'issued_at' => now(),
            'notes' => $request->input('notes')
        ]);

        return response()->json($invoice, 201);
    }

    protected function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . now()->format('Ymd');
        $random = Str::upper(Str::random(4));
        return "{$prefix}-{$random}";
    }
}
