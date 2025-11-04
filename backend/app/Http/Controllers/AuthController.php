<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:driver,dealer,admin'],
            'plan' => ['required', Rule::in(['Starter', 'Gold Driver', 'Dealer Pro'])],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'address_line_one' => ['nullable', 'string', 'max:255'],
            'address_line_two' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'postcode' => ['nullable', 'string', 'max:50'],
            'company_number' => ['nullable', 'string', 'max:50'],
            'trade_policy_document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'trade_plate_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'utility_bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'passport_number' => ['nullable', 'string', 'max:50'],
            'passport_selfie' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'driver_dvla_code' => ['nullable', 'string', 'max:50'],
            'driver_utility_bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'driver_license_front' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'driver_license_back' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'driver_passport' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'driver_selfie' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $isDealer = $validated['role'] === 'dealer';
        $isDriver = $validated['role'] === 'driver';

        if ($isDealer) {
            $request->validate([
                'company' => ['required', 'string', 'max:255'],
                'company_number' => ['required', 'string', 'max:50'],
                'address_line_one' => ['required', 'string', 'max:255'],
                'city' => ['required', 'string', 'max:255'],
                'postcode' => ['required', 'string', 'max:50'],
                'trade_policy_document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
                'trade_plate_photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
                'utility_bill' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
                'passport_number' => ['required', 'string', 'max:50'],
                'passport_selfie' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            ]);
        }

        if ($isDriver) {
            $request->validate([
                'driver_dvla_code' => ['required', 'string', 'max:50'],
                'passport_number' => ['required', 'string', 'max:50'],
                'driver_utility_bill' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
                'driver_license_front' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
                'driver_license_back' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
                'driver_passport' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
                'driver_selfie' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            ]);
        }

        $documentPaths = [
            'trade_policy_path' => null,
            'trade_plate_photo_path' => null,
            'utility_bill_path' => null,
            'passport_selfie_path' => null,
            'driver_utility_bill_path' => null,
            'driver_license_front_path' => null,
            'driver_license_back_path' => null,
            'driver_passport_path' => null,
            'driver_selfie_path' => null,
        ];

        $disk = config('filesystems.default', 'public');

        if ($isDealer) {
            $documentPaths['trade_policy_path'] = $request->file('trade_policy_document')
                ? Storage::disk($disk)->put('dealer-documents', $request->file('trade_policy_document'))
                : null;
            $documentPaths['trade_plate_photo_path'] = $request->file('trade_plate_photo')
                ? Storage::disk($disk)->put('dealer-documents', $request->file('trade_plate_photo'))
                : null;
            $documentPaths['utility_bill_path'] = $request->file('utility_bill')
                ? Storage::disk($disk)->put('dealer-documents', $request->file('utility_bill'))
                : null;
            $documentPaths['passport_selfie_path'] = $request->file('passport_selfie')
                ? Storage::disk($disk)->put('dealer-documents', $request->file('passport_selfie'))
                : null;
        }

        if ($isDriver) {
            $documentPaths['driver_utility_bill_path'] = $request->file('driver_utility_bill')
                ? Storage::disk($disk)->put('driver-documents', $request->file('driver_utility_bill'))
                : null;
            $documentPaths['driver_license_front_path'] = $request->file('driver_license_front')
                ? Storage::disk($disk)->put('driver-documents', $request->file('driver_license_front'))
                : null;
            $documentPaths['driver_license_back_path'] = $request->file('driver_license_back')
                ? Storage::disk($disk)->put('driver-documents', $request->file('driver_license_back'))
                : null;
            $documentPaths['driver_passport_path'] = $request->file('driver_passport')
                ? Storage::disk($disk)->put('driver-documents', $request->file('driver_passport'))
                : null;
            $documentPaths['driver_selfie_path'] = $request->file('driver_selfie')
                ? Storage::disk($disk)->put('driver-documents', $request->file('driver_selfie'))
                : null;
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'plan' => $validated['plan'],
            'phone' => $validated['phone'] ?? null,
            'company' => $isDealer ? ($validated['company'] ?? null) : null,
            'address_line_one' => $isDealer ? ($validated['address_line_one'] ?? null) : null,
            'address_line_two' => $isDealer ? ($validated['address_line_two'] ?? null) : null,
            'city' => $isDealer ? ($validated['city'] ?? null) : null,
            'postcode' => $isDealer ? ($validated['postcode'] ?? null) : null,
            'company_number' => $isDealer ? ($validated['company_number'] ?? null) : null,
            'trade_policy_path' => $documentPaths['trade_policy_path'],
            'trade_plate_photo_path' => $documentPaths['trade_plate_photo_path'],
            'utility_bill_path' => $documentPaths['utility_bill_path'],
            'passport_number' => $request->input('passport_number') ?: null,
            'passport_selfie_path' => $documentPaths['passport_selfie_path'],
            'driver_dvla_code' => $isDriver ? $request->input('driver_dvla_code') : null,
            'driver_utility_bill_path' => $documentPaths['driver_utility_bill_path'],
            'driver_license_front_path' => $documentPaths['driver_license_front_path'],
            'driver_license_back_path' => $documentPaths['driver_license_back_path'],
            'driver_passport_path' => $documentPaths['driver_passport_path'],
            'driver_selfie_path' => $documentPaths['driver_selfie_path'],
        ]);

        $user->refresh();

        $token = $user->createToken('motorrelay')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'plan' => $user->plan
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.'
            ], 422);
        }

        $user->tokens()->delete();

        $token = $user->createToken('motorrelay')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'plan' => $user->plan
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'plan' => $user?->plan
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->user()?->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->noContent();
    }
}
