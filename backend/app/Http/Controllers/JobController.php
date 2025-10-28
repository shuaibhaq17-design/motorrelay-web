<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\JobDailyMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Str;

class JobController extends Controller
{
    public function highlights(Request $request): JsonResponse
    {
        $jobs = Job::query()
            ->where('status', 'open')
            ->where(function ($builder) {
                $builder
                    ->whereNull('goes_live_at')
                    ->orWhere('goes_live_at', '<=', now());
            })
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

        $query = Job::query()->with([
            'postedBy:id,name',
            'assignedTo:id,name',
            'finalizedInvoice:id,job_id,status,number,total,currency,issued_at'
        ]);

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
            $query->whereIn('status', ['in_progress', 'accepted', 'collected', 'in_transit', 'pending', 'completion_pending'])
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

        if (!$user || !$user->isAdmin()) {
            $query->where(function ($builder) use ($user) {
                $builder
                    ->whereNull('goes_live_at')
                    ->orWhere('goes_live_at', '<=', now());

                if ($user) {
                    $builder->orWhere('posted_by_id', $user->id);
                }
            });
        }

        if ($user && $user->isDriver()) {
            $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
            if ($planSlug === 'starter') {
                $radius = config('jobs.plan_limits.starter.job_distance_radius', 50);
                $query->where(function ($builder) use ($radius) {
                    $builder->whereNull('distance_mi')
                        ->orWhere('distance_mi', '<=', $radius);
                });
            }
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
            'pickup_postcode' => ['required', 'string', 'max:20'],
            'dropoff_postcode' => ['required', 'string', 'max:20'],
            'vehicle_make' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'transport_type' => ['required', Rule::in(['drive_away', 'trailer'])],
            'pickup_ready_at' => ['nullable', 'date'],
            'delivery_due_at' => ['nullable', 'date'],
            'is_urgent' => ['nullable', 'boolean'],
            'urgent_accept_fee' => ['nullable', 'boolean'],
        ]);

        $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
        $planLimits = config("jobs.plan_limits.{$planSlug}", []);

        if ($user->isDealer() && !$user->isAdmin() && !empty($planLimits)) {
            $startOfMonth = Carbon::now()->startOfMonth();
            $monthlyLimit = $planLimits['monthly_job_posts'] ?? null;
            if ($monthlyLimit) {
                $postsThisMonth = Job::where('posted_by_id', $user->id)
                    ->where('created_at', '>=', $startOfMonth)
                    ->count();

                if ($postsThisMonth >= $monthlyLimit) {
                    abort(422, sprintf(
                        'Starter plan allows up to %d jobs per month. Upgrade to add more.',
                        $monthlyLimit
                    ));
                }
            }
        }

        if (!empty($data['pickup_ready_at']) && !empty($data['delivery_due_at'])) {
            $pickupReady = Carbon::parse($data['pickup_ready_at']);
            $deliveryDue = Carbon::parse($data['delivery_due_at']);

            if ($deliveryDue->lt($pickupReady)) {
                abort(422, 'Delivery due time must be after the pickup ready time.');
            }
        }

        $isUrgent = (bool) ($data['is_urgent'] ?? false);
        $urgentFee = 0.0;

        if ($isUrgent) {
            if ($user->hasPaidSubscription()) {
                $urgentFee = 0.0;
            } else {
                if (!empty($planLimits)) {
                    $startOfMonth = isset($startOfMonth) ? $startOfMonth : Carbon::now()->startOfMonth();
                    $urgentLimit = $planLimits['urgent_boost_per_month'] ?? null;
                    if ($urgentLimit) {
                        $urgentCount = Job::where('posted_by_id', $user->id)
                            ->where('is_urgent', true)
                            ->where('created_at', '>=', $startOfMonth)
                            ->count();

                        if ($urgentCount >= $urgentLimit) {
                            abort(422, sprintf(
                                'Starter plan includes %d urgent boost per month. Upgrade to unlock more boosts.',
                                $urgentLimit
                            ));
                        }
                    }
                }

                if (!$request->boolean('urgent_accept_fee')) {
                    abort(422, 'You must acknowledge the urgent boost fee before posting this job.');
                }
                $urgentFee = (float) config('jobs.urgent_boost_fee', 25.0);
            }
        }

        $pickupReadyAt = !empty($data['pickup_ready_at']) ? Carbon::parse($data['pickup_ready_at']) : null;
        $deliveryDueAt = !empty($data['delivery_due_at']) ? Carbon::parse($data['delivery_due_at']) : null;

        $job = Job::create([
            'status' => 'open',
            'posted_by_id' => $user->id,
            'title' => $data['title'],
            'pickup_postcode' => $data['pickup_postcode'],
            'pickup_label' => $data['pickup_postcode'],
            'dropoff_postcode' => $data['dropoff_postcode'],
            'dropoff_label' => $data['dropoff_postcode'],
            'vehicle_make' => $data['vehicle_make'] ?? null,
            'vehicle_type' => null,
            'price' => $data['price'],
            'transport_type' => $data['transport_type'],
            'pickup_ready_at' => $pickupReadyAt,
            'delivery_due_at' => $deliveryDueAt,
            'goes_live_at' => now()->addMinutes(3),
            'is_urgent' => $isUrgent,
            'urgent_fee_amount' => $urgentFee,
        ]);

        return response()->json($job, 201);
    }

    public function show(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        $job->load([
            'postedBy:id,name,email',
            'assignedTo:id,name,email',
            'finalizedInvoice:id,job_id,status,number,total,currency,issued_at'
        ]);

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

        $isOwner = $user && $job->posted_by_id === $user->id;
        $isAdmin = $user && $user->isAdmin();

        if ($job->goes_live_at && $job->goes_live_at->isFuture() && !$isOwner && !$isAdmin) {
            abort(404);
        }

        if ($user && ($user->isAdmin() || $job->posted_by_id === $user->id || $job->assigned_to_id === $user->id)) {
            $expenses = $job->expenses()
                ->with(['driver:id,name'])
                ->orderByDesc('created_at')
                ->get();

            $job->setRelation('expenses', $expenses);

            $job->setAttribute('expenses_summary', [
                'submitted_total' => $expenses->where('status', 'submitted')->sum(fn ($expense) => $expense->total_amount),
                'approved_total' => $expenses->where('status', 'approved')->sum(fn ($expense) => $expense->total_amount),
                'rejected_total' => $expenses->where('status', 'rejected')->sum(fn ($expense) => $expense->total_amount),
            ]);
        }

        $this->recordJobView($job);

        if ($isOwner && ($user->plan_slug ?? Str::slug((string) $user->plan, '_')) === 'starter') {
            $job->setAttribute('basic_analytics', $this->basicAnalytics($job));
        }

        return response()->json($job);
    }

    public function update(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'You cannot update this job.');
        }

        $isOwnerDealer = $user->isDealer() && $job->posted_by_id === $user->id;
        $planSlug = $user->plan_slug ?? Str::slug((string) $user->plan, '_');
        $planLimits = config("jobs.plan_limits.{$planSlug}", []);

        if ($isOwnerDealer && $job->goes_live_at && now()->greaterThan($job->goes_live_at)) {
            abort(422, 'This job is already live and can no longer be edited.');
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'pickup_postcode' => ['sometimes', 'string', 'max:20'],
            'dropoff_postcode' => ['sometimes', 'string', 'max:20'],
            'vehicle_make' => ['nullable', 'string', 'max:255'],
            'transport_type' => ['sometimes', Rule::in(['drive_away', 'trailer'])],
            'pickup_ready_at' => ['sometimes', 'nullable', 'date'],
            'delivery_due_at' => ['sometimes', 'nullable', 'date'],
            'is_urgent' => ['sometimes', 'boolean'],
            'urgent_accept_fee' => ['nullable', 'boolean'],
        ]);

        if (array_key_exists('pickup_ready_at', $data) && array_key_exists('delivery_due_at', $data)
            && $data['pickup_ready_at'] !== null && $data['delivery_due_at'] !== null) {
            $pickupReady = Carbon::parse($data['pickup_ready_at']);
            $deliveryDue = Carbon::parse($data['delivery_due_at']);

            if ($deliveryDue->lt($pickupReady)) {
                abort(422, 'Delivery due time must be after the pickup ready time.');
            }
        }

        $updates = $data;

        if (array_key_exists('pickup_postcode', $updates)) {
            $updates['pickup_label'] = $updates['pickup_postcode'];
        }

        if (array_key_exists('dropoff_postcode', $updates)) {
            $updates['dropoff_label'] = $updates['dropoff_postcode'];
        }

        if (array_key_exists('pickup_ready_at', $updates)) {
            $updates['pickup_ready_at'] = $updates['pickup_ready_at'] ? Carbon::parse($updates['pickup_ready_at']) : null;
        }

        if (array_key_exists('delivery_due_at', $updates)) {
            $updates['delivery_due_at'] = $updates['delivery_due_at'] ? Carbon::parse($updates['delivery_due_at']) : null;
        }

        if (array_key_exists('is_urgent', $updates)) {
            $isUrgent = (bool) $updates['is_urgent'];
            $updates['is_urgent'] = $isUrgent;

            if ($isUrgent) {
                if ($user->hasPaidSubscription()) {
                    $updates['urgent_fee_amount'] = 0.0;
                } else {
                    if (!empty($planLimits) && !$job->is_urgent) {
                        $urgentLimit = $planLimits['urgent_boost_per_month'] ?? null;
                        if ($urgentLimit) {
                            $startOfMonth = Carbon::now()->startOfMonth();
                            $urgentCount = Job::where('posted_by_id', $user->id)
                                ->where('is_urgent', true)
                                ->where('created_at', '>=', $startOfMonth)
                                ->count();

                            if ($urgentCount >= $urgentLimit) {
                                abort(422, sprintf(
                                    'Starter plan includes %d urgent boost per month. Upgrade to unlock more boosts.',
                                    $urgentLimit
                                ));
                            }
                        }
                    }

                    if (!$request->boolean('urgent_accept_fee')) {
                        abort(422, 'You must acknowledge the urgent boost fee before marking this job urgent.');
                    }
                    $updates['urgent_fee_amount'] = (float) config('jobs.urgent_boost_fee', 25.0);
                }
            } else {
                $updates['urgent_fee_amount'] = 0.0;
            }
        }

        $job->update($updates);

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

    protected function recordJobView(Job $job): void
    {
        $today = Carbon::today()->toDateString();

        $metric = JobDailyMetric::firstOrCreate(
            [
                'job_id' => $job->id,
                'date' => $today,
            ],
            [
                'views' => 0,
            ]
        );

        $metric->increment('views');
    }

    protected function basicAnalytics(Job $job): array
    {
        $today = Carbon::today();
        $windowStart = $today->copy()->subDays(6);

        $metrics = JobDailyMetric::query()
            ->where('job_id', $job->id)
            ->whereDate('date', '>=', $windowStart->toDateString())
            ->orderBy('date')
            ->get();

        $viewsToday = (int) optional(
            $metrics->firstWhere('date', $today->toDateString())
        )->views ?? 0;

        $viewsLastSeven = (int) $metrics->sum('views');

        return [
            'views_today' => $viewsToday,
            'views_last_7_days' => $viewsLastSeven,
            'daily' => $metrics->map(fn (JobDailyMetric $metric) => [
                'date' => $metric->date,
                'views' => (int) $metric->views,
            ])->values(),
        ];
    }
}
