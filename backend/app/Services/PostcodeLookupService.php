<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PostcodeLookupService
{
    public function find(string $postcode): array
    {
        $postcode = $this->normalisePostcode($postcode);

        if ($postcode === '') {
            abort(422, 'Enter a valid postcode.');
        }

        $apiKey = trim((string) config('postcodes.api_key'));
        if (!$apiKey) {
            abort(500, 'Postcode lookup API key is not configured.');
        }

        $response = Http::acceptJson()
            ->timeout(15)
            ->get(sprintf(
                '%s/%s',
                rtrim((string) config('postcodes.api_url'), '/'),
                urlencode($postcode)
            ), [
                'api-key' => $apiKey,
            ]);

        if ($response->status() === 404) {
            abort(422, 'No addresses found for this postcode. Use a real full UK postcode, or use postcode-only for testing.');
        }

        if (!$response->successful()) {
            $message = $response->json('Message')
                ?? $response->json('message')
                ?? $response->json('error')
                ?? $response->body();

            abort(422, sprintf(
                'Postcode lookup failed (%s). %s',
                $response->status(),
                trim(substr((string) $message, 0, 180)) ?: 'Check the postcode and API key.'
            ));
        }

        $payload = $response->json() ?? [];
        $addresses = collect($payload['addresses'] ?? [])
            ->filter(fn ($address) => is_string($address) && trim($address) !== '')
            ->values()
            ->map(fn (string $address, int $index) => [
                'id' => (string) $index,
                'label' => $this->formatAddress($address),
            ])
            ->all();

        if (empty($addresses)) {
            abort(422, 'No addresses found for this postcode. Use a real full UK postcode, or use postcode-only for testing.');
        }

        return [
            'postcode' => $payload['postcode'] ?? $postcode,
            'latitude' => $payload['latitude'] ?? null,
            'longitude' => $payload['longitude'] ?? null,
            'addresses' => $addresses,
        ];
    }

    protected function normalisePostcode(string $postcode): string
    {
        return strtoupper(trim(preg_replace('/\s+/', ' ', $postcode) ?? ''));
    }

    protected function formatAddress(string $address): string
    {
        return collect(explode(',', $address))
            ->map(fn (string $part) => trim($part))
            ->filter()
            ->implode(', ');
    }
}
