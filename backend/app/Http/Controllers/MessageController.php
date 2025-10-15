<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\MessageThread;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $threads = MessageThread::query()
            ->with([
                'participants:id,name',
                'messages' => function ($query) {
                    $query->latest()->limit(1);
                }
            ])
            ->whereHas('participants', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (MessageThread $thread) {
                $lastMessage = $thread->messages->first();
                return [
                    'id' => $thread->id,
                    'subject' => $thread->subject,
                    'participants' => $thread->participants->map(fn (User $participant) => [
                        'id' => $participant->id,
                        'name' => $participant->name
                    ]),
                    'last_message' => $lastMessage?->body,
                    'updated_at' => $thread->updated_at,
                ];
            });

        return response()->json(['data' => $threads]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'thread_id' => ['nullable', 'exists:message_threads,id'],
            'recipient_id' => [
                'required_without:thread_id',
                'exists:users,id',
                Rule::notIn([$user->id]),
            ],
            'subject' => ['required_without:thread_id', 'string', 'max:255'],
            'body' => ['required', 'string']
        ]);

        $thread = DB::transaction(function () use ($validated, $user) {
            if (!empty($validated['thread_id'])) {
                $thread = MessageThread::findOrFail($validated['thread_id']);

                if (!$thread->participants()->where('user_id', $user->id)->exists()) {
                    abort(403, 'You do not belong to this thread.');
                }
            } else {
                $thread = MessageThread::create([
                    'subject' => $validated['subject'],
                ]);
                $thread->participants()->attach([$user->id, $validated['recipient_id']]);
            }

            $message = new Message([
                'body' => $validated['body'],
                'user_id' => $user->id
            ]);

            $thread->messages()->save($message);

            $thread->touch();

            return $thread->fresh([
                'participants:id,name',
                'messages' => fn ($query) => $query->latest()->limit(1)
            ]);
        });

        $lastMessage = $thread->messages->first();

        return response()->json([
            'id' => $thread->id,
            'subject' => $thread->subject,
            'participants' => $thread->participants,
            'last_message' => $lastMessage?->body,
            'updated_at' => $thread->updated_at,
        ], 201);
    }
}
