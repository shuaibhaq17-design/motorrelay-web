<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;

class UserProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        $assignedJobs = $user->assignedJobs()
            ->select([
                'id',
                'title',
                'status',
                'price',
                'company',
                'vehicle_make',
                'distance_mi',
                'pickup_postcode',
                'dropoff_postcode',
                'created_at',
                'assigned_to_id'
            ])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $postedJobs = collect();

        if ($user->isDealer() || $user->isAdmin()) {
            $postedJobs = $user->postedJobs()
                ->select([
                    'id',
                    'title',
                    'status',
                    'price',
                    'company',
                    'vehicle_make',
                    'distance_mi',
                    'pickup_postcode',
                    'dropoff_postcode',
                    'created_at',
                    'posted_by_id'
                ])
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();
        }

        $completedStatuses = ['completed', 'closed', 'delivered'];
        $completedJobs = $assignedJobs
            ->merge($postedJobs)
            ->filter(function ($job) use ($completedStatuses) {
                $status = strtolower((string) ($job->status ?? ''));
                return in_array($status, $completedStatuses, true);
            })
            ->sortByDesc('created_at')
            ->values();

        $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
        $planLimits = config("jobs.plan_limits.{$planSlug}", []);
        $usage = [];

        if ($planSlug === 'starter') {
            if ($user->isDealer()) {
                $startOfMonth = Carbon::now()->startOfMonth();
                $postsThisMonth = $user->postedJobs()
                    ->where('created_at', '>=', $startOfMonth)
                    ->count();

                $urgentThisMonth = $user->postedJobs()
                    ->where('created_at', '>=', $startOfMonth)
                    ->where('is_urgent', true)
                    ->count();

                $usage['job_posts_this_month'] = $postsThisMonth;
                $usage['job_posts_limit'] = $planLimits['monthly_job_posts'] ?? null;
                $usage['urgent_boosts_used'] = $urgentThisMonth;
                $usage['urgent_boosts_limit'] = $planLimits['urgent_boost_per_month'] ?? null;
            }

            if ($user->isDriver()) {
                $applicationsToday = $user->jobApplications()
                    ->where('created_at', '>=', Carbon::today())
                    ->count();

                $usage['applications_today'] = $applicationsToday;
                $usage['applications_daily_limit'] = $planLimits['daily_applications'] ?? null;
            }
        }

        return response()->json([
            'user' => $user,
            'plan' => $user->plan,
            'plan_slug' => $planSlug,
            'plan_limits' => $planLimits,
            'usage' => $usage,
            'jobs' => [
                'assigned' => $assignedJobs->values(),
                'posted' => $postedJobs->values(),
                'completed' => $completedJobs
            ]
        ]);
    }
}
