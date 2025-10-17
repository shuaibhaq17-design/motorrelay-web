<?php

namespace App\Http\Controllers;

use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function highlights(Request $request): JsonResponse
    {
        $jobs = Job::query()
            ->where('status', 'open')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get(['id', 'price', 'pickup_label', 'dropoff_label', 'status']);

        return response()->json([
            'jobs' => $jobs
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->string('scope')->toString();
        $status = $request->string('status')->toString();

        $query = Job::query()->with(['postedBy:id,name', 'assignedTo:id,name']);

        if ($user) {
            $query->visibleTo($user);

            if ($user->isDriver()) {
                $query->with(['applications' => function ($builder) use ($user) {
                    $builder->where('driver_id', $user->id);
                }]);
            }
        }

        if ($scope === 'available') {
            $query->where('status', 'open')->whereNull('assigned_to_id');
        } elseif ($scope === 'current') {
            $query->whereIn('status', ['in_progress', 'accepted', 'collected', 'in_transit', 'pending'])
                ->when(!$user?->isAdmin(), function ($inner) use ($user) {
                    $inner->where(function ($child) use ($user) {
                        $child->where('assigned_to_id', $user->id)
                            ->orWhere('posted_by_id', $user->id);
                    });
                });
        } elseif ($scope === 'completed') {
            $query->whereIn('status', ['completed', 'delivered', 'cancelled', 'closed'])
                ->when(!$user?->isAdmin(), function ($inner) use ($user) {
                    $inner->where(function ($child) use ($user) {
                        $child->where('assigned_to_id', $user->id)
                            ->orWhere('posted_by_id', $user->id);
                    });
                });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('pickup_postcode', 'like', "%{$search}%")
                    ->orWhere('dropoff_postcode', 'like', "%{$search}%");
            });
        }

        $jobs = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        if ($user && $user->isDriver()) {
            $jobs->getCollection()->transform(function (Job $jobItem) use ($user) {
                $application = $jobItem->applications->first();
                $jobItem->setRelation('my_application', $application);
                $jobItem->unsetRelation('applications');
                return $jobItem;
            });
        }

        return response()->json($jobs);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isDealer() && !$user->isAdmin())) {
            abort(403, 'Only dealers or admins can create jobs.');
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'pickup_label' => ['required', 'string', 'max:255'],
            'pickup_postcode' => ['required', 'string', 'max:20'],
            'dropoff_label' => ['required', 'string', 'max:255'],
            'dropoff_postcode' => ['required', 'string', 'max:20'],
            'pickup_notes' => ['nullable', 'string'],
            'dropoff_notes' => ['nullable', 'string'],
            'distance_mi' => ['nullable', 'numeric', 'min:0'],
            'company' => ['nullable', 'string', 'max:255'],
            'vehicle_make' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $job = Job::create(array_merge($data, [
            'status' => 'open',
            'posted_by_id' => $user->id,
        ]));

        return response()->json($job, 201);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        $job->load(['postedBy:id,name,email', 'assignedTo:id,name,email']);

        if ($user) {
            if ($user->isAdmin() || $job->posted_by_id === $user->id) {
                $job->setRelation(
                    'applications',
                    $job->applications()
                        ->with(['driver:id,name,email'])
                        ->orderByRaw("FIELD(status, 'pending', 'accepted', 'declined')")
                        ->latest()
                        ->get()
                );
            } elseif ($user->isDriver()) {
                $job->setRelation(
                    'my_application',
                    $job->applications()
                        ->where('driver_id', $user->id)
                        ->first()
                );
            }
        }

        return response()->json($job);
    }

    public function update(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'pickup_label' => ['sometimes', 'string', 'max:255'],
            'pickup_postcode' => ['sometimes', 'string', 'max:20'],
            'dropoff_label' => ['sometimes', 'string', 'max:255'],
            'dropoff_postcode' => ['sometimes', 'string', 'max:20'],
            'pickup_notes' => ['nullable', 'string'],
            'dropoff_notes' => ['nullable', 'string'],
            'distance_mi' => ['nullable', 'numeric', 'min:0'],
            'company' => ['nullable', 'string', 'max:255'],
            'vehicle_make' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $job->update($data);

        return response()->json($job);
    }

    public function destroy(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'You cannot delete this job.');
        }

        $job->delete();

        return response()->noContent();
    }
}
