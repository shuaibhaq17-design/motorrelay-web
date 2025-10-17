<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isDriver()) {
            abort(403, 'Only drivers can access this resource.');
        }

        $assignedJobs = $user->assignedJobs()
            ->with([
                'postedBy:id,name,email',
            ])
            ->orderByDesc('created_at')
            ->get();

        $activeStatuses = ['in_progress', 'accepted', 'collected', 'in_transit', 'pending'];
        $completedStatuses = ['completed', 'delivered', 'closed'];

        $activeJobs = $assignedJobs
            ->filter(fn ($job) => in_array(strtolower((string) $job->status), $activeStatuses, true))
            ->values();

        $completedJobs = $assignedJobs
            ->filter(fn ($job) => in_array(strtolower((string) $job->status), $completedStatuses, true))
            ->sortByDesc('created_at')
            ->values();

        $applications = JobApplication::query()
            ->with([
                'job:id,title,price,status,posted_by_id,created_at',
                'job.postedBy:id,name,email',
            ])
            ->where('driver_id', $user->id)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        $stats = [
            'active_count' => $activeJobs->count(),
            'completed_count' => $completedJobs->count(),
            'pending_applications' => $applications->count(),
            'total_earnings' => $completedJobs->reduce(function ($carry, $job) {
                return $carry + (float) ($job->price ?? 0);
            }, 0.0),
        ];

        return response()->json([
            'stats' => $stats,
            'active' => $activeJobs,
            'applications' => $applications,
            'completed' => $completedJobs->take(20)->values(),
        ]);
    }
}
