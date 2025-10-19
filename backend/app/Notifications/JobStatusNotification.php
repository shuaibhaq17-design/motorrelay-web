<?php

namespace App\Notifications;

use App\Models\Job;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class JobStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Job $job,
        protected string $event,
        protected ?array $meta = null
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $job = $this->job->fresh(['postedBy:id,name', 'assignedTo:id,name']);

        return [
            'type' => 'job.event',
            'event' => $this->event,
            'job_id' => $job->id,
            'job_status' => $job->status,
            'job_title' => $job->title,
            'assigned_driver' => $job->assignedTo ? [
                'id' => $job->assignedTo->id,
                'name' => $job->assignedTo->name,
            ] : null,
            'meta' => $this->meta,
        ];
    }
}
