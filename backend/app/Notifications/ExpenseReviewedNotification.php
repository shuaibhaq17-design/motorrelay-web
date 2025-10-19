<?php

namespace App\Notifications;

use App\Models\Expense;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ExpenseReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(protected Expense $expense)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'expense.reviewed',
            'expense_id' => $this->expense->id,
            'job_id' => $this->expense->job_id,
            'status' => $this->expense->status,
            'amount' => (float) $this->expense->amount,
            'vat_rate' => (float) $this->expense->vat_rate,
            'total' => $this->expense->total_amount,
            'review_note' => $this->expense->review_note,
            'reviewed_at' => optional($this->expense->reviewed_at)->toIso8601String(),
        ];
    }
}
