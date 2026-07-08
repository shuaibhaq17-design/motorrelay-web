<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_account_id')->nullable()->after('driver_selfie_path');
            $table->boolean('stripe_onboarding_complete')->default(false)->after('stripe_account_id');
            $table->boolean('stripe_charges_enabled')->default(false)->after('stripe_onboarding_complete');
            $table->boolean('stripe_payouts_enabled')->default(false)->after('stripe_charges_enabled');
        });

        Schema::table('jobs', function (Blueprint $table) {
            $table->string('payment_status')->default('unpaid')->after('platform_fee_reference');
            $table->string('stripe_checkout_session_id')->nullable()->after('payment_status');
            $table->string('stripe_payment_intent_id')->nullable()->after('stripe_checkout_session_id');
            $table->string('stripe_transfer_id')->nullable()->after('stripe_payment_intent_id');
            $table->decimal('driver_payout_amount', 10, 2)->default(0)->after('platform_fee_amount');
            $table->timestamp('paid_at')->nullable()->after('stripe_transfer_id');
            $table->timestamp('payout_released_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropColumn([
                'payment_status',
                'stripe_checkout_session_id',
                'stripe_payment_intent_id',
                'stripe_transfer_id',
                'driver_payout_amount',
                'paid_at',
                'payout_released_at',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stripe_account_id',
                'stripe_onboarding_complete',
                'stripe_charges_enabled',
                'stripe_payouts_enabled',
            ]);
        });
    }
};

