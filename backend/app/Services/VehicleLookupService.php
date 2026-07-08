<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class VehicleLookupService
{
    public function lookup(string $registration): array
    {
        $registration = $this->normaliseRegistration($registration);

        if ($registration === '') {
            abort(422, 'Enter a valid registration plate.');
        }

        $apiKey = trim((string) config('mot.api_key'));
        if (!$apiKey) {
            abort(500, 'MOT vehicle lookup API key is not configured.');
        }

        $response = Http::withToken($this->accessToken())
            ->withHeaders([
                'Accept' => 'application/json',
                'X-API-Key' => $apiKey,
            ])
            ->timeout(15)
            ->get(sprintf(
                '%s/vehicles/registration/%s',
                rtrim((string) config('mot.api_url'), '/'),
                urlencode($registration)
            ));

        if ($response->status() === 404) {
            abort(404, 'No vehicle found for this registration.');
        }

        if (!$response->successful()) {
            $message = $response->json('message')
                ?? $response->json('error')
                ?? $response->json('errorMessage')
                ?? $response->body();

            if ($response->status() === 401) {
                Cache::forget('mot_history_access_token');
            }

            abort(422, sprintf(
                'Vehicle lookup failed (%s). %s',
                $response->status(),
                trim(substr((string) $message, 0, 180)) ?: 'Check the registration and API key.'
            ));
        }

        return $this->formatVehicle($registration, $response->json() ?? []);
    }

    public function normaliseRegistration(string $registration): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/i', '', $registration) ?? '');
    }

    protected function accessToken(): string
    {
        $clientId = trim((string) config('mot.client_id'));
        $clientSecret = trim((string) config('mot.client_secret'));
        $scope = trim((string) config('mot.scope'));

        if (!$clientId || !$clientSecret || !$scope) {
            abort(500, 'MOT vehicle lookup OAuth credentials are not configured.');
        }

        return Cache::remember('mot_history_access_token', now()->addMinutes(59), function () use ($clientId, $clientSecret, $scope) {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(15)
                ->post((string) config('mot.token_url'), [
                    'grant_type' => 'client_credentials',
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'scope' => $scope,
                ]);

            if (!$response->successful() || !$response->json('access_token')) {
                $message = $response->json('error_description')
                    ?? $response->json('error')
                    ?? $response->body();

                abort(500, sprintf(
                    'MOT vehicle lookup authentication failed (%s). %s',
                    $response->status(),
                    trim(substr((string) $message, 0, 180)) ?: 'Check OAuth credentials.'
                ));
            }

            return (string) $response->json('access_token');
        });
    }

    protected function formatVehicle(string $registration, array $data): array
    {
        $data = is_array($data) && isset($data[0]) && is_array($data[0])
            ? $data[0]
            : $data;

        $latestMot = $data['motTests'][0] ?? null;
        $make = $data['make'] ?? $data['vehicleMake'] ?? null;
        $model = $data['model'] ?? $data['vehicleModel'] ?? null;
        $colour = $data['primaryColour'] ?? $data['colour'] ?? null;
        $fuelType = $data['fuelType'] ?? null;

        return [
            'registration' => $registration,
            'make' => $make,
            'model' => $model,
            'display_name' => trim(implode(' ', array_filter([$make, $model]))) ?: $registration,
            'colour' => $colour,
            'fuel_type' => $fuelType,
            'vehicle_type' => trim(implode(' ', array_filter([$colour, $fuelType]))) ?: null,
            'first_used_date' => $data['firstUsedDate'] ?? null,
            'registration_date' => $data['registrationDate'] ?? null,
            'manufacture_date' => $data['manufactureDate'] ?? null,
            'engine_size' => $data['engineSize'] ?? null,
            'odometer_value' => $latestMot['odometerValue'] ?? null,
            'odometer_unit' => $latestMot['odometerUnit'] ?? null,
            'raw' => $data,
        ];
    }
}
