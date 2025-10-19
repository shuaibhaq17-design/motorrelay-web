<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class InvoiceReadyNotification extends Notification
{
    use Queueable;

    public function __construct(protected Invoice $invoice)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'invoice.ready',
            'invoice_id' => $this->invoice->id,
            'invoice_number' => $this->invoice->number,
            'job_id' => $this->invoice->job_id,
            'status' => $this->invoice->status,
            'total' => (float) $this->invoice->total,
            'currency' => $this->invoice->currency,
            'issued_at' => optional($this->invoice->issued_at)->toIso8601String(),
        ];
    }
}
