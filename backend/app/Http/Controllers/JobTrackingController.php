<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\Message;
use App\Models\MessageThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JobTrackingController extends Controller
{
    public function store(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'Only the assigned driver can share tracking updates.');
        }

        if (!$job->assigned_to_id) {
            abort(422, 'Tracking is only available once a driver is assigned.');
        }

        if (!in_array(strtolower((string) $job->status), ['accepted', 'collected', 'in_transit', 'in_progress'], true)) {
            abort(422, 'Tracking is available once the job is underway.');
        }

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'speed_kph' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'heading' => ['nullable', 'numeric', 'min:0', 'max:360'],
            'eta_minutes' => ['nullable', 'integer', 'min:0', 'max:600'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'source' => ['nullable', 'string', 'max:100'],
        ]);

        [$messagePayload, $jobPayload] = DB::transaction(function () use ($validated, $job, $user) {
            $job->update([
                'current_latitude' => $validated['latitude'],
                'current_longitude' => $validated['longitude'],
                'last_tracked_at' => now(),
            ]);

            $thread = $this->resolveThread($job);
            $thread->touch();

            $meta = [
                'type' => 'location_update',
                'location' => [
                    'lat' => (float) $validated['latitude'],
                    'lng' => (float) $validated['longitude'],
                    'speed_kph' => isset($validated['speed_kph']) ? (float) $validated['speed_kph'] : null,
                    'heading' => isset($validated['heading']) ? (float) $validated['heading'] : null,
                    'accuracy' => isset($validated['accuracy']) ? (float) $validated['accuracy'] : null,
                    'recorded_at' => now()->toIso8601String(),
                    'source' => $validated['source'] ?? null,
                ],
                'eta_minutes' => $validated['eta_minutes'] ?? null,
                'job' => [
                    'id' => $job->id,
                    'title' => $job->title,
                ],
                'destination' => [
                    'label' => $job->dropoff_label,
                    'postcode' => $job->dropoff_postcode,
                ],
                'driver' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
            ];

            $message = $thread->messages()->create([
                'user_id' => $user->id,
                'body' => null,
                'meta' => $meta,
            ]);

            $this->createReceipts($thread, $message, $user->id);

            $message->load(['user:id,name', 'attachments', 'receipts']);

            return [
                [
                    'id' => $message->id,
                    'body' => $message->body,
                    'meta' => $message->meta,
                    'user' => [
                        'id' => $message->user->id,
                        'name' => $message->user->name,
                    ],
                    'attachments' => [],
                    'receipts' => $message->receipts->map(fn ($receipt) => [
                        'user_id' => $receipt->user_id,
                        'delivered_at' => $receipt->delivered_at,
                        'viewed_at' => $receipt->viewed_at,
                    ]),
                    'created_at' => $message->created_at,
                ],
                [
                    'id' => $job->id,
                    'current_latitude' => $job->current_latitude,
                    'current_longitude' => $job->current_longitude,
                    'last_tracked_at' => $job->last_tracked_at,
                ],
            ];
        });

        return response()->json([
            'message' => $messagePayload,
            'job' => $jobPayload,
        ], 201);
    }

    protected function resolveThread(Job $job): MessageThread
    {
        $query = MessageThread::query()
            ->where('job_id', $job->id)
            ->whereHas('participants', fn ($participantQuery) => $participantQuery->where('user_id', $job->posted_by_id))
            ->whereHas('participants', fn ($participantQuery) => $participantQuery->where('user_id', $job->assigned_to_id))
            ->with('participants');

        $thread = $query->first();

        if ($thread) {
            return $thread;
        }

        $thread = MessageThread::create([
            'subject' => sprintf('Job #%d updates', $job->id),
            'job_id' => $job->id,
        ]);

        $participantIds = collect([$job->posted_by_id, $job->assigned_to_id])->filter()->unique()->values();
        if ($participantIds->isNotEmpty()) {
            $thread->participants()->syncWithoutDetaching($participantIds);
        }

        return $thread->fresh('participants');
    }

    protected function createReceipts(MessageThread $thread, Message $message, int $senderId): void
    {
        $now = now();
        $payload = $thread->participants()
            ->pluck('user_id')
            ->map(fn ($participantId) => [
                'user_id' => $participantId,
                'delivered_at' => $now,
                'viewed_at' => $participantId === $senderId ? $now : null,
            ])
            ->all();

        $message->receipts()->createMany($payload);
    }
}
