<?php

namespace App\Http\Controllers;

use App\Models\AccountChangeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AccountChangeRequestController extends Controller
{
    private const ALLOWED_FIELDS = [
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
        'notes',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = $user->accountChangeRequests()
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'address_line_one' => ['nullable', 'string', 'max:255'],
            'address_line_two' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:50'],
            'company_number' => ['nullable', 'string', 'max:50'],
            'driver_dvla_code' => ['nullable', 'string', 'max:50'],
            'passport_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $payload = collect($validated)
            ->filter(fn ($value, $field) => in_array($field, self::ALLOWED_FIELDS, true))
            ->filter(function ($value, $field) use ($user) {
                if ($field === 'notes') {
                    return $value !== null && trim((string) $value) !== '';
                }
                return $value !== null && $value !== $user->{$field};
            })
            ->all();

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'request' => 'No changes detected. Update a field before submitting.',
            ]);
        }

        $existingPending = AccountChangeRequest::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();

        if ($existingPending >= 3) {
            throw ValidationException::withMessages([
                'request' => 'You have pending change requests. Please wait for the admin review.',
            ]);
        }

        $changeRequest = AccountChangeRequest::create([
            'user_id' => $user->id,
            'payload' => $payload,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Your update was sent to the MotorRelay team. We will review and confirm shortly.',
            'request' => $changeRequest,
        ], 201);
    }
}
