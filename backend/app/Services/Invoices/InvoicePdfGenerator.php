<?php

namespace App\Services\Invoices;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Job;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InvoicePdfGenerator
{
    private const PAGE_WIDTH = 595.28; // A4 width in points
    private const PAGE_HEIGHT = 841.89; // A4 height in points

    public function render(Invoice $invoice, Job $job, Collection $items): string
    {
        $currency = strtoupper($invoice->currency ?? 'GBP');

        $issuedAt = $invoice->issued_at ? $invoice->issued_at->copy() : Carbon::now();
        $dueAt = $invoice->issued_at
            ? $invoice->issued_at->copy()->addDays(14)
            : $issuedAt->copy()->addDays(14);

        $billTo = array_values(array_filter([
            $job->postedBy?->name,
            $job->postedBy?->email,
            trim(($job->pickup_label ?? '') . ' ' . ($job->pickup_postcode ?? '')),
        ], fn ($line) => $line !== null && $line !== ''));

        $payTo = [
            'MotorRelay Finance',
            'Sort Code: 04-00-44',
            'Account: 12345678',
            'Reference: ' . $invoice->number,
        ];

        $invoiceDetails = [
            'Invoice No: ' . $invoice->number,
            'Issued: ' . $issuedAt->format('d M Y'),
            'Due: ' . $dueAt->format('d M Y'),
            'Status: ' . ucfirst($invoice->status),
        ];

        $jobSummary = array_values(array_filter([
            'Job #' . $job->id,
            $job->title,
            'Pickup: ' . trim(($job->pickup_label ?? '') . ' ' . ($job->pickup_postcode ?? '')),
            'Drop-off: ' . trim(($job->dropoff_label ?? '') . ' ' . ($job->dropoff_postcode ?? '')),
        ], fn ($line) => $line !== null && $line !== ''));

        $lineItems = $items->map(function (InvoiceItem $item) use ($currency) {
            $quantity = $item->quantity ?? 1;
            return [
                'description' => $item->description ?? 'Service',
                'unit' => $this->formatMoney((float) $item->amount, $currency),
                'qty' => (string) $quantity,
                'total' => $this->formatMoney((float) $item->total, $currency),
            ];
        })->values();

        $ops = [];
        $pageWidth = self::PAGE_WIDTH;
        $pageHeight = self::PAGE_HEIGHT;

        $green = [11 / 255, 93 / 255, 71 / 255];
        $darkText = [48 / 255, 51 / 255, 58 / 255];
        $mutedText = [90 / 255, 95 / 255, 105 / 255];

        // Header block
        $this->rectFill($ops, 0, $pageHeight - 130, $pageWidth, 130, $green);
        $this->drawText($ops, 'MotorRelay', 60, $pageHeight - 60, 28, true, [1, 1, 1]);
        $this->drawText($ops, 'Move smarter logistics', 60, $pageHeight - 86, 12, false, [1, 1, 1]);
        $this->drawText($ops, 'INVOICE', $pageWidth - 170, $pageHeight - 58, 26, true, [1, 1, 1]);
        $this->drawText($ops, '#' . $invoice->number, $pageWidth - 170, $pageHeight - 84, 12, false, [1, 1, 1]);

        $this->drawLine($ops, 60, $pageHeight - 150, $pageWidth - 60, $pageHeight - 150, [0.82, 0.85, 0.87], 0.8);

        // Details sections
        $detailsTop = $pageHeight - 180;
        $leftCursor = $this->writeSection($ops, 'Issued to', $billTo, 60, $detailsTop, $green, $darkText);
        $leftCursor = $this->writeSection($ops, 'Pay to', $payTo, 60, $leftCursor, $green, $darkText);

        $rightColumnX = $pageWidth - 220;
        $rightCursor = $this->writeSection($ops, 'Invoice details', $invoiceDetails, $rightColumnX, $detailsTop, $green, $darkText);
        $rightCursor = $this->writeSection($ops, 'Job summary', $jobSummary, $rightColumnX, $rightCursor, $green, $darkText);

        $tableTop = min($leftCursor, $rightCursor) - 20;
        $tableLeft = 60;
        $tableWidth = $pageWidth - 120;
        $headerHeight = 28;
        $rowHeight = 26;

        $headerBottom = $tableTop - $headerHeight;
        $this->rectFill($ops, $tableLeft, $headerBottom, $tableWidth, $headerHeight, [0.90, 0.95, 0.93]);

        $headerTextY = $headerBottom + $headerHeight - 10;
        $descriptionX = $tableLeft + 8;
        $unitX = $tableLeft + 260;
        $qtyX = $tableLeft + 350;
        $totalX = $tableLeft + $tableWidth - 56;

        $this->drawText($ops, 'DESCRIPTION', $descriptionX, $headerTextY, 10, true, $green);
        $this->drawText($ops, 'UNIT PRICE', $unitX, $headerTextY, 10, true, $green);
        $this->drawText($ops, 'QTY', $qtyX, $headerTextY, 10, true, $green);
        $this->drawText($ops, 'TOTAL', $totalX, $headerTextY, 10, true, $green);

        $rowTop = $headerBottom;
        foreach ($lineItems as $index => $line) {
            $rowBottom = $rowTop - $rowHeight;

            if ($index % 2 === 0) {
                $this->rectFill($ops, $tableLeft, $rowBottom, $tableWidth, $rowHeight, [0.97, 0.98, 0.97]);
            }

            $textY = $rowBottom + $rowHeight - 9;
            $this->drawText($ops, $line['description'], $descriptionX, $textY, 10, false, $darkText);
            $this->drawText($ops, $line['unit'], $unitX, $textY, 10, false, $darkText);
            $this->drawText($ops, $line['qty'], $qtyX, $textY, 10, false, $darkText);
            $this->drawText($ops, $line['total'], $totalX, $textY, 10, false, $darkText);

            $rowTop = $rowBottom;
            $this->drawLine($ops, $tableLeft, $rowBottom, $tableLeft + $tableWidth, $rowBottom, [0.90, 0.92, 0.93], 0.5);
        }

        $totalsY = $rowTop - 18;
        $this->drawLine($ops, $tableLeft, $rowTop + 6, $tableLeft + $tableWidth, $rowTop + 6, [0.75, 0.78, 0.80], 0.8);

        $totalLabelX = $totalX - 140;
        $totalValueX = $totalX;

        $this->drawText($ops, 'Subtotal', $totalLabelX, $totalsY, 11, true, $darkText);
        $this->drawText($ops, $this->formatMoney((float) $invoice->subtotal, $currency), $totalValueX, $totalsY, 11, false, $darkText);
        $totalsY -= 18;

        $this->drawText($ops, 'VAT', $totalLabelX, $totalsY, 11, true, $darkText);
        $this->drawText($ops, $this->formatMoney((float) $invoice->vat_total, $currency), $totalValueX, $totalsY, 11, false, $darkText);
        $totalsY -= 24;

        $this->drawText($ops, 'TOTAL DUE', $totalLabelX, $totalsY, 13, true, $green);
        $this->drawText($ops, $this->formatMoney((float) $invoice->total, $currency), $totalValueX, $totalsY, 13, true, $green);

        $footerY = 150;
        $this->drawLine($ops, 60, $footerY + 20, $pageWidth - 60, $footerY + 20, [0.90, 0.92, 0.93], 0.5);
        $this->drawText($ops, 'Payment terms: due within 14 days.', 60, $footerY + 4, 10, false, $mutedText);
        $this->drawText($ops, 'Thank you for partnering with MotorRelay.', 60, $footerY - 12, 10, false, $mutedText);
        $this->drawText($ops, 'motorrelay.com', $pageWidth - 160, $footerY - 12, 10, false, $mutedText);

        return $this->finalizePdf($ops, $pageWidth, $pageHeight);
    }

    private function writeSection(array &$ops, string $title, array $lines, float $x, float $startY, array $titleColor, array $textColor): float
    {
        $this->drawText($ops, strtoupper($title), $x, $startY, 10, true, $titleColor);
        $y = $startY - 18;
        foreach ($lines as $line) {
            if ($line === null || trim((string) $line) === '') {
                continue;
            }
            $this->drawText($ops, (string) $line, $x, $y, 11, false, $textColor);
            $y -= 16;
        }

        return $y - 12;
    }

    private function drawText(array &$ops, string $text, float $x, float $y, float $size = 12, bool $bold = false, array $rgb = [0, 0, 0]): void
    {
        [$r, $g, $b] = $rgb;
        $font = $bold ? 'F2' : 'F1';
        $escaped = $this->escapeText($text);
        $ops[] = sprintf(
            '%.3f %.3f %.3f rg BT /%s %.2f Tf 1 0 0 1 %.2f %.2f Tm (%s) Tj ET',
            $r,
            $g,
            $b,
            $font,
            $size,
            $x,
            $y,
            $escaped
        );
    }

    private function rectFill(array &$ops, float $x, float $y, float $width, float $height, array $rgb): void
    {
        [$r, $g, $b] = $rgb;
        $ops[] = sprintf('q %.3f %.3f %.3f rg %.2f %.2f %.2f %.2f re f Q', $r, $g, $b, $x, $y, $width, $height);
    }

    private function drawLine(array &$ops, float $x1, float $y1, float $x2, float $y2, array $rgb = [0, 0, 0], float $width = 1.0): void
    {
        [$r, $g, $b] = $rgb;
        $ops[] = sprintf(
            'q %.3f %.3f %.3f RG %.2f w %.2f %.2f m %.2f %.2f l S Q',
            $r,
            $g,
            $b,
            $width,
            $x1,
            $y1,
            $x2,
            $y2
        );
    }

    private function formatMoney(float $amount, string $currency): string
    {
        $symbol = $this->currencySymbol($currency);
        $formatted = number_format($amount, 2);

        return $symbol ? $symbol . $formatted : $currency . ' ' . $formatted;
    }

    private function currencySymbol(string $currency): string
    {
        return match ($currency) {
            'GBP' => '£',
            'USD' => '$',
            'EUR' => '€',
            default => ''
        };
    }

    private function finalizePdf(array $operations, float $pageWidth, float $pageHeight): string
    {
        $streamContent = implode("\n", $operations) . "\n";
        $length = strlen($streamContent);

        $objects = [
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
            "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 {$pageWidth} {$pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj",
            "4 0 obj << /Length {$length} >> stream\n{$streamContent}endstream endobj",
            "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
            "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
        ];

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
