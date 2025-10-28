<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Job;
use App\Models\JobApplication;
use App\Models\MessageThread;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdminPortalController extends Controller
{
    private const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress', 'in_transit'];
    private const COMPLETED_STATUSES = ['delivered', 'completed', 'finalized'];

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->isAdmin(), 403, 'Admin access required.');

        $jobs = Job::query()
            ->with(['assignedTo:id,name'])
            ->orderByDesc('created_at')
            ->get();

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'plan', 'email_verified_at', 'created_at'])
            ->get();

        $applications = JobApplication::query()
            ->with([
                'job:id,title,status,posted_by_id,created_at',
                'driver:id,name,email',
            ])
            ->orderByDesc('created_at')
            ->get();

        $threads = MessageThread::query()
            ->with([
                'job:id,title',
                'messages' => function ($query) {
                    $query->latest()->limit(1)->with('user:id,name');
                },
            ])
            ->orderByDesc('updated_at')
            ->get();

        $invoices = Invoice::query()
            ->select(['id', 'status', 'total'])
            ->get();

        return response()->json([
            'overview' => $this->buildOverviewPayload($jobs, $users, $applications),
            'applications' => $this->buildApplicationsPayload($applications),
            'conversations' => $this->buildConversationsPayload($threads),
            'plans' => $this->buildPlansPayload($users, $invoices),
            'system_health' => $this->buildSystemHealthPayload($jobs, $threads, $applications, $invoices),
            'content' => $this->buildContentPayload(),
        ]);
    }

    private function buildOverviewPayload(Collection $jobs, Collection $users, Collection $applications): array
    {
        $activeJobsCount = $jobs->filter(fn ($job) => in_array($job->status, self::ACTIVE_STATUSES, true))->count();
        $completedJobsCount = $jobs->filter(fn ($job) => in_array($job->status, self::COMPLETED_STATUSES, true))->count();

        $planCounts = $users->filter(fn ($user) => !empty($user->plan))
            ->groupBy(fn ($user) => strtolower($user->plan))
            ->map->count();

        $pipelineConfig = [
            'open' => 'Open',
            'assigned' => 'Assigned',
            'in_transit' => 'In transit',
            'delivered' => 'Completed',
            'cancelled' => 'Cancelled',
        ];

        $pipeline = collect($pipelineConfig)->map(function (string $label, string $status) use ($jobs) {
            $matching = $jobs->filter(fn ($job) => $job->status === $status);

            return [
                'status' => $status,
                'label' => $label,
                'count' => $matching->count(),
                'jobs' => $matching->take(5)->map(fn ($job) => [
                    'id' => $job->id,
                    'reference' => $this->formatJobReference($job),
                    'title' => $job->title,
                    'pickup_postcode' => $job->pickup_postcode,
                    'dropoff_postcode' => $job->dropoff_postcode,
                ])->values(),
            ];
        })->values();

        $leaderboard = $jobs->filter(fn ($job) => $job->assigned_to_id !== null)
            ->groupBy('assigned_to_id')
            ->map(function (Collection $group) {
                $driver = $group->first()->assignedTo;

                return [
                    'driver' => $driver?->name ?? 'Unknown driver',
                    'completed' => $group->filter(fn ($job) => in_array($job->status, self::COMPLETED_STATUSES, true))->count(),
                    'active' => $group->filter(fn ($job) => in_array($job->status, self::ACTIVE_STATUSES, true))->count(),
                    'revenue' => (float) $group->sum('price'),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->take(5);

        $driversPending = $applications->where('status', 'pending')->count();
        $driversApproved = $applications->where('status', 'accepted')->count();

        $verification = [
            'dealers_pending' => 0,
            'dealers_approved' => $users->where('role', 'dealer')->count(),
            'drivers_pending' => $driversPending,
            'drivers_approved' => $driversApproved,
        ];

        return [
            'stats' => [
                'active_jobs' => [
                    'value' => $activeJobsCount,
                    'subtitle' => $jobs->count() . ' total',
                ],
                'completed_jobs' => [
                    'value' => $completedJobsCount,
                    'subtitle' => 'Last 200 records',
                ],
                'memberships' => [
                    'value' => $planCounts->sum(),
                    'subtitle' => count(array_filter([
                        $planCounts['starter'] ?? 0,
                        $planCounts['gold_driver'] ?? 0,
                        $planCounts['dealer_pro'] ?? 0,
                    ])) . ' plans',
                ],
            ],
            'pipeline' => $pipeline,
            'leaderboard' => $leaderboard,
            'verification' => $verification,
        ];
    }

    private function buildApplicationsPayload(Collection $applications): array
    {
        $driverApplications = $applications->map(function ($application) {
            return [
                'id' => $application->id,
                'driver' => $application->driver?->name ?? 'Unknown driver',
                'job_title' => $application->job?->title,
                'status' => $application->status,
                'submitted_at' => optional($application->created_at)->toIso8601String(),
            ];
        })->values();

        return [
            'dealerships' => [],
            'drivers' => $driverApplications,
        ];
    }

    private function buildConversationsPayload(Collection $threads): array
    {
        return $threads->map(function (MessageThread $thread) {
            $lastMessage = $thread->messages->first();

            return [
                'id' => $thread->id,
                'subject' => $thread->subject,
                'job_reference' => $thread->job ? $this->formatJobReference($thread->job) : null,
                'job_title' => $thread->job?->title,
                'last_message' => $lastMessage?->body,
                'last_author' => $lastMessage?->user?->name,
                'updated_at' => optional($thread->updated_at)->toIso8601String(),
                'is_stale' => $thread->updated_at ? $thread->updated_at->lt(now()->subDays(14)) : false,
            ];
        })->values()->all();
    }

    private function buildPlansPayload(Collection $users, Collection $invoices): array
    {
        $planConfig = collect((array) config('admin.plans'));
        $planCounts = $users->filter(fn ($user) => !empty($user->plan))
            ->groupBy(fn ($user) => strtolower($user->plan))
            ->map->count();

        $tiers = $planConfig->map(function (array $plan) use ($planCounts) {
            return [
                'name' => $plan['name'],
                'label' => $plan['label'],
                'price_label' => $plan['price_label'],
                'features' => $plan['features'],
                'subscribers' => $planCounts[$plan['name']] ?? 0,
            ];
        })->values();

        $pastDue = $invoices->where('status', 'past_due')->count();
        $activeSubscriptions = $users->filter(fn ($user) => !empty($user->plan))->count();

        return [
            'tiers' => $tiers,
            'alerts' => [
                'past_due_accounts' => $pastDue,
                'active_subscriptions' => $activeSubscriptions,
                'mix' => [
                    'starter' => $planCounts['starter'] ?? 0,
                    'gold_driver' => $planCounts['gold_driver'] ?? 0,
                    'dealer_pro' => $planCounts['dealer_pro'] ?? 0,
                ],
            ],
        ];
    }

    private function buildSystemHealthPayload(Collection $jobs, Collection $threads, Collection $applications, Collection $invoices): array
    {
        $openOver48h = $jobs->filter(function ($job) {
            return $job->created_at
                && in_array($job->status, self::ACTIVE_STATUSES, true)
                && $job->created_at->lt(now()->subHours(48));
        })->count();

        $staleConversations = $threads->filter(function (MessageThread $thread) {
            return $thread->updated_at && $thread->updated_at->lt(now()->subDays(14));
        })->count();

        $pendingDriverVerifications = $applications->where('status', 'pending')->count();
        $pendingDealerReviews = 0;
        $pastDueMemberships = $invoices->where('status', 'past_due')->count();

        return [
            'widgets' => [
                [
                    'label' => 'Open jobs > 48h',
                    'value' => $openOver48h,
                    'description' => $openOver48h ? 'Investigate ageing jobs.' : 'All recent jobs are healthy.',
                ],
                [
                    'label' => 'Stale conversations',
                    'value' => $staleConversations,
                    'description' => $staleConversations ? 'Reach out to unblock.' : 'No stale threads.',
                ],
                [
                    'label' => 'Pending dealer reviews',
                    'value' => $pendingDealerReviews,
                    'description' => $pendingDealerReviews ? 'Approve or decline dealer sign-ups.' : 'All dealer applications processed.',
                ],
                [
                    'label' => 'Pending driver verifications',
                    'value' => $pendingDriverVerifications,
                    'description' => $pendingDriverVerifications ? 'Driver queue requires review.' : 'Driver queue clear.',
                ],
                [
                    'label' => 'Past-due memberships',
                    'value' => $pastDueMemberships,
                    'description' => $pastDueMemberships ? 'Follow up with billing.' : 'All memberships current.',
                ],
            ],
            'issues' => [],
        ];
    }

    private function buildContentPayload(): array
    {
        $config = (array) config('admin');

        return [
            'announcements' => $config['announcements'] ?? [],
            'legal_links' => $config['legal_links'] ?? [],
            'feature_flags' => $config['feature_flags'] ?? [],
        ];
    }

    private function formatJobReference($job): string
    {
        $id = is_object($job) ? $job->id : (int) $job;
        $year = is_object($job) && $job->created_at ? $job->created_at->format('Y') : now()->format('Y');

        return 'MR-' . $year . '-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    }
}
