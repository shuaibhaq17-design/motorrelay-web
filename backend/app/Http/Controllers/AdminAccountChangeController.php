<?php

namespace App\Http\Controllers;

use App\Models\AccountChangeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAccountChangeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->isAdmin(), 403, 'Admin access required.');

        $status = $request->string('status')->toString();

        $requests = AccountChangeRequest::query()
            ->with(['user:id,name,email,company,phone', 'reviewer:id,name'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($requests);
    }

    public function decide(Request $request, AccountChangeRequest $accountChangeRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->isAdmin(), 403, 'Admin access required.');

        if ($accountChangeRequest->status !== 'pending') {
            abort(422, 'This request has already been processed.');
        }

        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $decision = $validated['decision'];

        DB::transaction(function () use ($decision, $validated, $accountChangeRequest, $user) {
            if ($decision === 'approved') {
                $this->applyChanges($accountChangeRequest);
            }

            $accountChangeRequest->update([
                'status' => $decision,
                'admin_notes' => $validated['admin_notes'] ?? null,
                'reviewed_by_id' => $user->id,
                'reviewed_at' => now(),
            ]);
        });

        $accountChangeRequest->load(['user:id,name,email,company,phone', 'reviewer:id,name']);

        return response()->json([
            'message' => $decision === 'approved' ? 'Request approved and account updated.' : 'Request rejected.',
            'request' => $accountChangeRequest,
        ]);
    }

    protected function applyChanges(AccountChangeRequest $request): void
    {
        $user = $request->user;
        if (!$user) {
            return;
        }

        $payload = $request->payload ?? [];
        $updatable = collect($payload)
            ->only([
                'name',
                'email',
                'phone',
                'company',
                'address_line_one',
                'address_line_two',
                'city',
                'postcode',
                'company_number',
                'driver_dvla_code',
                'passport_number',
            ])
            ->all();

        if (!empty($updatable)) {
            $user->update($updatable);
        }
    }
}
