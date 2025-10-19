<?php

namespace App\Services\Invoices;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Job;
use Illuminate\Support\Collection;

class InvoicePdfGenerator
{
    public function render(Invoice $invoice, Job $job, Collection $items): string
    {
        $lines = collect();
        $currency = strtoupper($invoice->currency);

        $lines->push(sprintf('Invoice %s', $invoice->number));
        $lines->push(sprintf('Job #%d - %s', $job->id, $job->title));
        $lines->push(sprintf('Issued: %s', optional($invoice->issued_at)->toDateString()));
        $lines->push(sprintf('Status: %s', ucfirst($invoice->status)));
        $lines->push('');
        $lines->push('Bill to:');
        $lines->push($job->postedBy?->name ?? 'Dealer');
        $lines->push('');
        $lines->push('Line items:');

        $items->each(function (InvoiceItem $item, int $index) use ($lines, $currency) {
            $lineNumber = $index + 1;
            $lines->push(sprintf(
                '%d. %s - %s %s (VAT %s%%)',
                $lineNumber,
                $item->description,
                number_format((float) $item->total, 2),
                $currency,
                number_format((float) $item->vat_rate, 2)
            ));
        });

        $lines->push('');
        $lines->push(sprintf('Subtotal: %s %s', number_format((float) $invoice->subtotal, 2), $currency));
        $lines->push(sprintf('VAT: %s %s', number_format((float) $invoice->vat_total, 2), $currency));
        $lines->push(sprintf('Total due: %s %s', number_format((float) $invoice->total, 2), $currency));

        return $this->buildPdf($lines->all());
    }

    protected function buildPdf(array $lines): string
    {
        $streamLines = [];
        $y = 760;

        foreach ($lines as $line) {
            $escaped = $this->escapeText((string) $line);
            $streamLines[] = "BT /F1 12 Tf 72 {$y} Td ({$escaped}) Tj ET";
            $y -= 18;
        }

        $streamContent = implode("\n", $streamLines) . "\n";
        $length = strlen($streamContent);

        $objects = [];
        $objects[] = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj";
        $objects[] = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj";
        $objects[] = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj";
        $objects[] = "4 0 obj << /Length {$length} >> stream\n{$streamContent}endstream endobj";
        $objects[] = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        $position = strlen($pdf);

        foreach ($objects as $object) {
            $offsets[] = $position;
            $pdf .= "{$object}\n";
            $position = strlen($pdf);
        }

        $xrefPosition = strlen($pdf);
        $pdf .= "xref\n0 " . count($offsets) . "\n";
        foreach ($offsets as $offset) {
            $pdf .= str_pad((string) $offset, 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $pdf .= "trailer << /Size " . count($offsets) . " /Root 1 0 R >>\nstartxref\n{$xrefPosition}\n%%EOF";

        return $pdf;
    }

    protected function escapeText(string $text): string
    {
        $replacements = [
            '\\' => '\\\\',
            '(' => '\(',
            ')' => '\)',
        ];

        return strtr($text, $replacements);
    }
}
