<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\Message;
use App\Models\MessageThread;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $threads = MessageThread::query()
            ->with([
                'participants:id,name',
                'messages' => fn ($query) => $query->latest()->limit(1)->with(['receipts', 'attachments']),
            ])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->where('user_id', '<>', $user->id)
                    ->whereHas('receipts', function ($receipt) use ($user) {
                        $receipt->where('user_id', $user->id)->whereNull('viewed_at');
                    });
            }])
            ->whereHas('participants', fn ($query) => $query->where('user_id', $user->id))
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (MessageThread $thread) {
                $lastMessage = $thread->messages->first();
                return [
                    'id' => $thread->id,
                    'subject' => $thread->subject,
                    'job_id' => $thread->job_id,
                    'participants' => $thread->participants->map(fn (User $participant) => [
                        'id' => $participant->id,
                        'name' => $participant->name,
                    ]),
                    'last_message' => $lastMessage?->body ?? ($lastMessage && $lastMessage->attachments->isNotEmpty() ? '[Attachment]' : null),
                    'updated_at' => $thread->updated_at,
                    'unread_count' => $thread->unread_count,
                ];
            });

        return response()->json(['data' => $threads]);
    }

    public function show(Request $request, MessageThread $thread): JsonResponse
    {
        $user = $request->user();

        if (!$thread->participants()->where('user_id', $user->id)->exists()) {
            abort(403, 'You do not belong to this thread.');
        }

        $messages = $thread->messages()
            ->with(['user:id,name', 'attachments', 'receipts'])
            ->orderBy('created_at')
            ->get()
            ->map(function (Message $message) {
                return [
                    'id' => $message->id,
                    'body' => $message->body,
                    'meta' => $message->meta,
                    'user' => [
                        'id' => $message->user->id,
                        'name' => $message->user->name,
                    ],
                    'attachments' => $message->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'url' => Storage::disk($attachment->disk)->url($attachment->path),
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                    ]),
                    'receipts' => $message->receipts->map(fn ($receipt) => [
                        'user_id' => $receipt->user_id,
                        'delivered_at' => $receipt->delivered_at,
                        'viewed_at' => $receipt->viewed_at,
                    ]),
                    'created_at' => $message->created_at,
                ];
            });

        $this->markDelivered($thread, $user->id);

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'thread_id' => ['nullable', 'exists:message_threads,id'],
            'job_id' => ['nullable', 'exists:jobs,id'],
            'recipient_id' => [
                'required_without:thread_id',
                'exists:users,id',
                Rule::notIn([$user->id]),
            ],
            'subject' => ['required_without:thread_id', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['array'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        if (empty($validated['body']) && !$request->hasFile('attachments')) {
            return response()->json([
                'message' => 'A message body or an attachment is required.',
            ], 422);
        }

        [$thread, $message] = DB::transaction(function () use ($validated, $user, $request) {
            if (!empty($validated['thread_id'])) {
                $thread = MessageThread::with('job')->findOrFail($validated['thread_id']);

                if (!$thread->participants()->where('user_id', $user->id)->exists()) {
                    abort(403, 'You do not belong to this thread.');
                }

                $this->assertJobIsActive($thread->job, $user->id);
            } else {
                $job = null;
                if (!empty($validated['job_id'])) {
                    $job = Job::findOrFail($validated['job_id']);
                    $this->assertJobIsActive($job, $user->id, $validated['recipient_id']);
                }

                $thread = MessageThread::create([
                    'subject' => $validated['subject'],
                    'job_id' => $job?->id,
                ]);

                $thread->participants()->attach([$user->id, $validated['recipient_id']]);
            }

            $message = new Message([
                'body' => array_key_exists('body', $validated) ? $validated['body'] : null,
                'user_id' => $user->id,
                'meta' => [],
            ]);

            $thread->messages()->save($message);

            $this->storeAttachments($message, $request->file('attachments', []));
            $this->createReceipts($thread, $message, $user->id);

            $thread->touch();

            return [
                $thread->fresh([
                    'participants:id,name',
                    'messages' => fn ($query) => $query->latest()->limit(1)->with('attachments'),
                ]),
                $message->fresh(['user:id,name', 'attachments', 'receipts']),
            ];
        });

        $lastMessage = $thread->messages->first();

        $threadSummary = [
            'id' => $thread->id,
            'subject' => $thread->subject,
            'job_id' => $thread->job_id,
            'participants' => $thread->participants->map(fn (User $participant) => [
                'id' => $participant->id,
                'name' => $participant->name,
            ]),
            'last_message' => $lastMessage?->body ?? ($lastMessage && $lastMessage->attachments->isNotEmpty() ? '[Attachment]' : null),
            'updated_at' => $thread->updated_at,
            'unread_count' => 0,
        ];

        $messagePayload = [
            'id' => $message->id,
            'body' => $message->body,
            'meta' => $message->meta,
            'user' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
            ],
            'attachments' => $message->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'url' => Storage::disk($attachment->disk)->url($attachment->path),
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
            ]),
            'receipts' => $message->receipts->map(fn ($receipt) => [
                'user_id' => $receipt->user_id,
                'delivered_at' => $receipt->delivered_at,
                'viewed_at' => $receipt->viewed_at,
            ]),
            'created_at' => $message->created_at,
        ];

        return response()->json([
            'thread' => $threadSummary,
            'message' => $messagePayload,
        ], 201);
    }

    public function markAsViewed(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        if (!$message->thread->participants()->where('user_id', $user->id)->exists()) {
            abort(403, 'You do not belong to this thread.');
        }

        $receipt = $message->receipts()->firstOrCreate(
            ['user_id' => $user->id],
            ['delivered_at' => now()]
        );

        if (!$receipt->viewed_at) {
            $receipt->update(['viewed_at' => now()]);
        }

        return response()->json([
            'message_id' => $message->id,
            'viewed_at' => $receipt->viewed_at,
        ]);
    }

    protected function storeAttachments(Message $message, array $files): void
    {
        foreach ($files as $file) {
            $path = $file->store('message-attachments', 'public');

            $message->attachments()->create([
                'disk' => 'public',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
            ]);
        }
    }

    protected function createReceipts(MessageThread $thread, Message $message, int $senderId): void
    {
        $now = now();

        $participantIds = $thread->participants()->pluck('user_id');

        foreach ($participantIds as $participantId) {
            $message->receipts()->firstOrCreate(
                ['user_id' => $participantId],
                [
                    'delivered_at' => $now,
                    'viewed_at' => $participantId === $senderId ? $now : null,
                ]
            );
        }
    }

    protected function markDelivered(MessageThread $thread, int $userId): void
    {
        DB::table('message_receipts')
            ->whereIn('message_id', $thread->messages()->pluck('id'))
            ->where('user_id', $userId)
            ->whereNull('delivered_at')
            ->update([
                'delivered_at' => now(),
                'updated_at' => now(),
            ]);
    }

    protected function assertJobIsActive(?Job $job, int $senderId, ?int $recipientId = null): void
    {
        if (!$job) {
            return;
        }

        if (!$job->assigned_to_id || $job->status !== 'in_progress') {
            abort(422, 'Messaging is available once a dealer accepts a driver.');
        }

        $allowed = collect([$job->posted_by_id, $job->assigned_to_id]);
        if (!$allowed->contains($senderId)) {
            abort(403, 'You are not allowed to message on this job.');
        }

        if ($recipientId !== null && !$allowed->contains($recipientId)) {
            abort(403, 'Recipient must be part of the job assignment.');
        }
    }
}
