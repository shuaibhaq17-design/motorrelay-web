<?php

namespace App\Services\Invoices;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Job;
use App\Models\User;
use App\Notifications\InvoiceReadyNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InvoiceFinalizer
{
    public function __construct(
        protected InvoicePdfGenerator $pdfGenerator
    ) {
    }

    public function finalize(Job $job, User $actor): Invoice
    {
        if ($job->finalized_invoice_id) {
            abort(422, 'This job already has a finalized invoice.');
        }

        if (!$job->assigned_to_id) {
            abort(422, 'Cannot finalize invoice for an unassigned job.');
        }

        if ($job->completion_status !== 'submitted') {
            abort(422, 'Job completion must be submitted before approval.');
        }

        $job->loadMissing(['postedBy', 'assignedTo', 'expenses']);

        $items = $this->buildLineItems($job);
        $totals = $this->calculateTotals($items);

        return DB::transaction(function () use ($job, $actor, $items, $totals) {
            $invoice = Invoice::create([
                'job_id' => $job->id,
                'number' => InvoiceNumberGenerator::make(),
                'status' => 'draft',
                'subtotal' => $totals['subtotal'],
                'vat_total' => $totals['vat_total'],
                'total' => $totals['total'],
                'currency' => config('invoices.default_currency', 'GBP'),
                'issued_at' => now(),
                'notes' => $job->completion_notes,
            ]);

            $invoice->items()->createMany($items->toArray());
            $invoice->load('items');

            $pdf = $this->pdfGenerator->render($invoice, $job, $invoice->items);
            $disk = config('invoices.invoice_disk');
            $path = sprintf(
                'jobs/%d/invoices/%s-%s.pdf',
                $job->id,
                Str::slug($invoice->number),
                $invoice->id
            );

            if (!Storage::disk($disk)->put($path, $pdf)) {
                abort(500, 'Failed to persist invoice PDF.');
            }

            $invoice->update([
                'status' => 'finalized',
                'finalized_at' => now(),
                'finalized_by_id' => $actor->id,
                'pdf_path' => $path,
                'pdf_disk' => $disk,
                'pdf_hash' => hash('sha256', $pdf),
            ]);

            $job->update([
                'status' => 'completed',
                'completed_at' => now(),
                'completion_status' => 'approved',
                'completion_approved_at' => now(),
                'finalized_invoice_id' => $invoice->id,
            ]);

            $invoice->refresh()->load('items');

            DB::afterCommit(function () use ($job, $invoice) {
                $recipients = Collection::make([$job->postedBy, $job->assignedTo])
                    ->filter()
                    ->unique('id')
                    ->all();

                if (!empty($recipients)) {
                    Notification::send($recipients, new InvoiceReadyNotification($invoice));
                }
            });

            return $invoice;
        });
    }

    protected function buildLineItems(Job $job): Collection
    {
        $items = Collection::make();
        $defaultVat = (float) config('invoices.default_vat_rate', 20);
        $currency = config('invoices.default_currency', 'GBP');

        $baseAmount = (float) $job->price;
        $items->push($this->makeItem(
            'job_fee',
            $job->title ? sprintf('Job fee — %s', $job->title) : sprintf('Job fee — #%d', $job->id),
            $baseAmount,
            $defaultVat,
            $job->id,
            Job::class
        ));

        if ($job->is_urgent && (float) $job->urgent_fee_amount > 0) {
            $items->push($this->makeItem(
                'urgent_fee',
                'Urgent boost fee',
                (float) $job->urgent_fee_amount,
                $defaultVat
            ));
        }

        if ((float) $job->platform_fee_amount > 0) {
            $label = $job->platform_fee_reference
                ? sprintf('Platform fee — %s', $job->platform_fee_reference)
                : 'Platform fee';

            $items->push($this->makeItem(
                'platform_fee',
                $label,
                (float) $job->platform_fee_amount,
                0.0
            ));
        }

        $approvedExpenses = $job->expenses
            ->filter(fn (Expense $expense) => $expense->status === 'approved');

        foreach ($approvedExpenses as $expense) {
            $items->push($this->makeItem(
                'expense',
                sprintf('Expense — %s', $expense->description),
                (float) $expense->amount,
                (float) $expense->vat_rate,
                $expense->id,
                Expense::class
            ));
        }

        return $items;
    }

    protected function makeItem(
        string $type,
        string $description,
        float $amount,
        float $vatRate,
        ?int $sourceId = null,
        ?string $sourceType = null
    ): array {
        $amount = round($amount, 2);
        $vatAmount = round($amount * ($vatRate / 100), 2);
        $total = round($amount + $vatAmount, 2);

        return [
            'type' => $type,
            'description' => $description,
            'amount' => $amount,
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'total' => $total,
            'quantity' => 1,
            'source_id' => $sourceId,
            'source_type' => $sourceType,
        ];
    }

    protected function calculateTotals(Collection $items): array
    {
        $subtotal = round($items->sum('amount'), 2);
        $vat = round($items->sum('vat_amount'), 2);
        $total = round($items->sum('total'), 2);

        return [
            'subtotal' => $subtotal,
            'vat_total' => $vat,
            'total' => $total,
        ];
    }
}
