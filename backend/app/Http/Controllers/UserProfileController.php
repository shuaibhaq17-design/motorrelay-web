<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json([
            'user' => $user,
            'plan' => $user->plan,
            'jobs' => [
                'assigned' => $assignedJobs->values(),
                'posted' => $postedJobs->values()
            ]
        ]);
    }
}
