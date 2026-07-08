<?php

namespace App\Http\Controllers;

use App\Models\Job;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Stripe;
use Stripe\StripeClient;
use Stripe\Transfer;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;

class StripePaymentController extends Controller
{
    public function onboardDriver(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isDriver()) {
            abort(403, 'Only drivers can set up payouts.');
        }

        $stripe = $this->stripeClient();

        if (!$user->stripe_account_id) {
            try {
                $account = $stripe->v2->core->accounts->create([
                    'contact_email' => $user->email,
                    'display_name' => $user->name ?: $user->email,
                    'identity' => [
                        'country' => 'GB',
                        'entity_type' => 'individual',
                        'individual' => [
                            'email' => $user->email,
                        ],
                    ],
                    'configuration' => [
                        'recipient' => [
                            'capabilities' => [
                                'stripe_balance' => [
                                    'stripe_transfers' => [
                                        'requested' => true,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'dashboard' => 'express',
                    'defaults' => [
                        'responsibilities' => [
                            'fees_collector' => 'application',
                            'losses_collector' => 'application',
                        ],
                    ],
                    'metadata' => [
                        'motorrelay_user_id' => (string) $user->id,
                    ],
                ]);
            } catch (ApiErrorException $exception) {
                return response()->json([
                    'message' => 'Stripe payout setup is not ready yet. In Stripe, make sure Connect and Accounts v2 are enabled for this sandbox, then try again.',
                    'stripe_error' => $exception->getMessage(),
                ], 422);
            }

            $user->forceFill([
                'stripe_account_id' => $account->id,
                'stripe_onboarding_complete' => false,
                'stripe_charges_enabled' => false,
                'stripe_payouts_enabled' => false,
            ])->save();
        }

        $frontendUrl = rtrim(config('stripe.frontend_url'), '/');

        try {
            $accountLink = $stripe->v2->core->accountLinks->create([
                'account' => $user->stripe_account_id,
                'use_case' => [
                    'type' => 'account_onboarding',
                    'account_onboarding' => [
                        'configurations' => ['recipient'],
                        'refresh_url' => "{$frontendUrl}/profile?stripe=refresh",
                        'return_url' => "{$frontendUrl}/profile?stripe=return",
                    ],
                ],
            ]);
        } catch (ApiErrorException $exception) {
            return response()->json([
                'message' => 'Stripe could not create the payout onboarding link. Check that this Stripe sandbox has Accounts v2 onboarding enabled.',
                'stripe_error' => $exception->getMessage(),
            ], 422);
        }

        return response()->json(['url' => $accountLink->url]);
    }

    public function disconnectDriver(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isDriver()) {
            abort(403, 'Only drivers can disconnect payout accounts.');
        }

        if ($user->stripe_account_id) {
            try {
                $stripe = $this->stripeClient();
                $stripe->v2->core->accounts->close($user->stripe_account_id, [
                    'applied_configurations' => ['recipient'],
                ]);
            } catch (ApiErrorException $exception) {
                return response()->json([
                    'message' => 'Stripe could not disconnect this payout account. Try again or contact support.',
                    'stripe_error' => $exception->getMessage(),
                ], 422);
            }
        }

        $user->forceFill([
            'stripe_account_id' => null,
            'stripe_onboarding_complete' => false,
            'stripe_charges_enabled' => false,
            'stripe_payouts_enabled' => false,
        ])->save();

        return response()->json([
            'message' => 'Payout account disconnected.',
            'user' => $user->fresh(),
        ]);
    }

    public function createJobCheckout(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the dealer that posted this job can take payment.');
        }

        if (!$job->assigned_to_id) {
            abort(422, 'Assign a driver before taking payment.');
        }

        if (in_array($job->payment_status, ['paid', 'payout_released'], true)) {
            abort(422, 'This job has already been paid.');
        }

        $this->configureStripe();

        $amount = $this->toPence((float) $job->price + (float) $job->urgent_fee_amount);
        if ($amount <= 0) {
            abort(422, 'Job price must be greater than zero before payment.');
        }

        $platformFee = round(((float) $job->price) * ((float) config('stripe.platform_fee_percent') / 100), 2);
        $driverPayout = max(round(((float) $job->price) - $platformFee, 2), 0);
        $frontendUrl = rtrim(config('stripe.frontend_url'), '/');

        $session = Session::create([
            'mode' => 'payment',
            'success_url' => "{$frontendUrl}/jobs/{$job->id}?payment=success&session_id={CHECKOUT_SESSION_ID}",
            'cancel_url' => "{$frontendUrl}/jobs/{$job->id}?payment=cancelled",
            'client_reference_id' => (string) $job->id,
            'customer_email' => $user->email,
            'metadata' => [
                'job_id' => (string) $job->id,
                'dealer_id' => (string) $user->id,
                'driver_id' => (string) $job->assigned_to_id,
            ],
            'line_items' => [[
                'price_data' => [
                    'currency' => config('stripe.currency'),
                    'unit_amount' => $amount,
                    'product_data' => [
                        'name' => $job->title ?: "MotorRelay job #{$job->id}",
                        'description' => trim("{$job->pickup_postcode} to {$job->dropoff_postcode}"),
                    ],
                ],
                'quantity' => 1,
            ]],
        ]);

        $job->forceFill([
            'payment_status' => 'checkout_pending',
            'stripe_checkout_session_id' => $session->id,
            'platform_fee_amount' => $platformFee,
            'driver_payout_amount' => $driverPayout,
            'platform_fee_reference' => sprintf('%s%% platform fee', config('stripe.platform_fee_percent')),
        ])->save();

        return response()->json([
            'url' => $session->url,
            'job' => $job->fresh(),
        ]);
    }

    public function syncJobPayment(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the dealer that posted this job can check payment.');
        }

        $sessionId = $request->string('session_id')->toString() ?: $job->stripe_checkout_session_id;
        if (!$sessionId) {
            abort(422, 'No Stripe checkout session exists for this job.');
        }

        $this->configureStripe();

        try {
            $session = Session::retrieve($sessionId);
        } catch (ApiErrorException $exception) {
            return response()->json([
                'message' => 'Stripe could not check this payment yet. Try again in a moment.',
                'stripe_error' => $exception->getMessage(),
            ], 422);
        }

        $sessionJobId = $session->metadata->job_id ?? $session->client_reference_id ?? null;
        if ((string) $sessionJobId !== (string) $job->id) {
            abort(422, 'This Stripe payment does not belong to this job.');
        }

        if (($session->payment_status ?? null) === 'paid') {
            $this->handleCheckoutCompleted($session);
        }

        return response()->json([
            'payment_status' => $session->payment_status ?? null,
            'job' => $job->fresh(),
        ]);
    }

    public function releaseDriverPayout(Request $request, Job $job): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && $job->posted_by_id !== $user->id)) {
            abort(403, 'Only the dealer that posted this job can release payout.');
        }

        if ($job->payment_status !== 'paid') {
            abort(422, 'Dealer payment must be completed before releasing payout.');
        }

        if (!$job->delivery_proof_path || $job->completion_status !== 'approved') {
            abort(422, 'Dealer must approve delivery proof before releasing payout.');
        }

        if ($job->stripe_transfer_id) {
            abort(422, 'Driver payout has already been released.');
        }

        $driver = User::find($job->assigned_to_id);
        if (!$driver?->stripe_account_id || !$this->driverCanReceiveStripeTransfers($driver)) {
            abort(422, 'Driver must finish Stripe payout setup before payout can be released.');
        }

        $amount = $this->toPence((float) $job->driver_payout_amount);
        if ($amount <= 0) {
            abort(422, 'Driver payout amount must be greater than zero.');
        }

        $this->configureStripe();

        $transfer = Transfer::create([
            'amount' => $amount,
            'currency' => config('stripe.currency'),
            'destination' => $driver->stripe_account_id,
            'metadata' => [
                'job_id' => (string) $job->id,
                'driver_id' => (string) $driver->id,
            ],
        ]);

        $job->forceFill([
            'payment_status' => 'payout_released',
            'stripe_transfer_id' => $transfer->id,
            'payout_released_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Driver payout released.',
            'job' => $job->fresh(),
        ]);
    }

    public function webhook(Request $request): Response
    {
        $this->configureStripe();

        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $webhookSecret = config('stripe.webhook_secret');

        try {
            $event = $webhookSecret
                ? Webhook::constructEvent($payload, $signature, $webhookSecret)
                : json_decode($payload, false, 512, JSON_THROW_ON_ERROR);
        } catch (SignatureVerificationException|\JsonException $exception) {
            return response('Invalid Stripe webhook payload.', 400);
        }

        match ($event->type ?? null) {
            'checkout.session.completed' => $this->handleCheckoutCompleted($event->data->object),
            'account.updated' => $this->handleAccountUpdated($event->data->object),
            default => null,
        };

        return response('ok');
    }

    protected function handleCheckoutCompleted(object $session): void
    {
        $jobId = $session->metadata->job_id ?? $session->client_reference_id ?? null;
        if (!$jobId) {
            return;
        }

        $job = Job::find($jobId);
        if (!$job) {
            return;
        }

        $job->forceFill([
            'payment_status' => 'paid',
            'stripe_checkout_session_id' => $session->id ?? $job->stripe_checkout_session_id,
            'stripe_payment_intent_id' => $session->payment_intent ?? $job->stripe_payment_intent_id,
            'paid_at' => now(),
        ])->save();
    }

    protected function handleAccountUpdated(object $account): void
    {
        if (!isset($account->id)) {
            return;
        }

        User::where('stripe_account_id', $account->id)->update([
            'stripe_onboarding_complete' => (bool) ($account->details_submitted ?? false),
            'stripe_charges_enabled' => (bool) ($account->charges_enabled ?? false),
            'stripe_payouts_enabled' => (bool) ($account->payouts_enabled ?? false),
        ]);
    }

    protected function driverCanReceiveStripeTransfers(User $driver): bool
    {
        if (!$driver->stripe_account_id) {
            return false;
        }

        try {
            $account = $this->stripeClient()->v2->core->accounts->retrieve($driver->stripe_account_id, [
                'include' => [
                    'configuration.recipient',
                    'requirements',
                ],
            ]);
        } catch (ApiErrorException) {
            return false;
        }

        $appliedConfigurations = (array) ($account->applied_configurations ?? []);
        $recipient = $account->configuration->recipient ?? null;
        $transferStatus = $recipient?->capabilities?->stripe_balance?->stripe_transfers?->status ?? null;
        $transfersEnabled = in_array((string) $transferStatus, ['active', 'enabled'], true);

        $driver->forceFill([
            'stripe_onboarding_complete' => in_array('recipient', $appliedConfigurations, true),
            'stripe_payouts_enabled' => $transfersEnabled,
            'stripe_charges_enabled' => false,
        ])->save();

        return $transfersEnabled;
    }

    protected function configureStripe(): void
    {
        $secretKey = config('stripe.secret_key');
        if (!$secretKey) {
            abort(500, 'Stripe secret key is not configured.');
        }

        Stripe::setApiKey($secretKey);
    }

    protected function stripeClient(): StripeClient
    {
        $secretKey = config('stripe.secret_key');
        if (!$secretKey) {
            abort(500, 'Stripe secret key is not configured.');
        }

        return new StripeClient($secretKey);
    }

    protected function toPence(float $amount): int
    {
        return (int) round($amount * 100);
    }
}
