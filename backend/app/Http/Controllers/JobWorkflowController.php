<?php

namespace App\Http\Controllers;

use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobWorkflowController extends Controller
{
    public function accept(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isDriver() && !$user->isAdmin())) {
            abort(403, 'Only drivers can accept jobs.');
        }

        if ($job->status !== 'open') {
            abort(422, 'Job is no longer available.');
        }

        $job->update([
            'status' => 'accepted',
            'assigned_to_id' => $user->id
        ]);

        return response()->json($job);
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
