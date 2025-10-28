<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\JobApplication;
use App\Models\MessageThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Str;

class JobApplicationController extends Controller
{
    public function index(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'You are not allowed to view applications for this job.');
        }

        $applications = $job->applications()
            ->with(['driver:id,name,email'])
            ->orderByRaw("FIELD(status, 'pending', 'accepted', 'declined')")
            ->latest()
            ->get();

        return response()->json([
            'data' => $applications,
        ]);
    }

    public function store(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isDriver() && !$user->isAdmin())) {
            abort(403, 'Only drivers can apply for jobs.');
        }

        if ($job->assigned_to_id) {
            abort(422, 'Job has already been assigned.');
        }

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $existingApplication = JobApplication::where('job_id', $job->id)
            ->where('driver_id', $user->id)
            ->first();

        $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
        if (!$existingApplication && $planSlug === 'starter' && !$user->isAdmin()) {
            $dailyLimit = config('jobs.plan_limits.starter.daily_applications', 0);
            if ($dailyLimit) {
                $applicationsToday = JobApplication::where('driver_id', $user->id)
                    ->where('created_at', '>=', Carbon::today())
                    ->count();

                if ($applicationsToday >= $dailyLimit) {
                    abort(422, sprintf(
                        'Starter plan allows up to %d applications per day. Please try again tomorrow or upgrade your plan.',
                        $dailyLimit
                    ));
                }
            }
        }

        $application = JobApplication::updateOrCreate(
            [
                'job_id' => $job->id,
                'driver_id' => $user->id,
            ],
            [
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
                'responded_at' => null,
            ]
        );

        return response()->json($application->fresh(), 201);
    }

    public function update(Request $request, Job $job, JobApplication $application): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the posting dealer can update applications.');
        }

        if ($application->job_id !== $job->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'declined'])],
        ]);

        $application = DB::transaction(function () use ($validated, $job, $application, $user) {
            if ($application->status !== 'pending') {
                abort(422, 'This application has already been processed.');
            }

            $status = $validated['status'];

            $application->update([
                'status' => $status,
                'responded_at' => now(),
            ]);

            if ($status === 'accepted') {
                $job->update([
                    'assigned_to_id' => $application->driver_id,
                    'status' => 'in_progress',
                ]);

                $job->applications()
                    ->where('id', '!=', $application->id)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'declined',
                        'responded_at' => now(),
                    ]);

                $this->ensureConversationExists($job, $user->id, $application->driver_id);
            }

            return $application->fresh(['driver:id,name,email']);
        });

        return response()->json($application);
    }

    protected function ensureConversationExists(Job $job, int $dealerId, int $driverId): void
    {
        $thread = MessageThread::query()
            ->where('job_id', $job->id)
            ->whereHas('participants', fn ($query) => $query->where('user_id', $dealerId))
            ->whereHas('participants', fn ($query) => $query->where('user_id', $driverId))
            ->first();

        if ($thread) {
            return;
        }

        $thread = MessageThread::create([
            'job_id' => $job->id,
            'subject' => sprintf('Job #%s conversation', $job->id),
        ]);

        $thread->participants()->attach([$dealerId, $driverId]);
    }
}
