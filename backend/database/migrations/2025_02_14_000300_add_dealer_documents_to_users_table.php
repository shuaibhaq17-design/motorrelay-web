<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_number')->nullable()->after('company');
            $table->string('trade_policy_path')->nullable()->after('company_number');
            $table->string('trade_plate_photo_path')->nullable()->after('trade_policy_path');
            $table->string('utility_bill_path')->nullable()->after('trade_plate_photo_path');
            $table->string('passport_number')->nullable()->after('utility_bill_path');
            $table->string('passport_selfie_path')->nullable()->after('passport_number');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_number',
                'trade_policy_path',
                'trade_plate_photo_path',
                'utility_bill_path',
                'passport_number',
                'passport_selfie_path',
            ]);
        });
    }
};
