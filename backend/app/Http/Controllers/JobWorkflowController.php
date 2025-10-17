<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\JobApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobWorkflowController extends Controller
{
    public function accept(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isDriver() && !$user->isAdmin())) {
            abort(403, 'Only drivers can apply for jobs.');
        }

        if ($job->assigned_to_id) {
            abort(422, 'Job has already been assigned.');
        }

        $application = JobApplication::updateOrCreate(
            [
                'job_id' => $job->id,
                'driver_id' => $user->id,
            ],
            [
                'status' => 'pending',
                'message' => $request->filled('message')
                    ? $request->string('message')->toString()
                    : null,
                'responded_at' => null,
            ]
        );

        return response()->json([
            'message' => 'Application submitted. Waiting for dealer approval.',
            'application' => $application,
        ], 202);
    }

    public function collected(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $job->update([
            'status' => 'collected'
        ]);

        return response()->json($job);
    }

    public function delivered(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->assigned_to_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $job->update([
            'status' => 'delivered'
        ]);

        return response()->json($job);
    }

    public function cancel(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'You cannot cancel this job.');
        }

        $job->update([
            'status' => 'cancelled',
            'assigned_to_id' => null
        ]);

        return response()->json($job);
    }
}
