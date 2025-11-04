<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvoiceReadyNotification extends Notification
{
    use Queueable;

    public function __construct(protected Invoice $invoice)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url('/invoices/' . $this->invoice->id);

        return (new MailMessage())
            ->subject('Invoice ready — ' . $this->invoice->number)
            ->greeting('Hi ' . ($notifiable->name ?? 'there'))
            ->line('An invoice has been generated for your recent MotorRelay job.')
            ->line('Invoice number: ' . $this->invoice->number)
            ->line('Total due: ' . number_format((float) $this->invoice->total, 2) . ' ' . strtoupper($this->invoice->currency ?? 'GBP'))
            ->action('View invoice', $url)
            ->line('Thank you for partnering with MotorRelay.');
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
