<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('driver_dvla_code')->nullable()->after('passport_selfie_path');
            $table->string('driver_utility_bill_path')->nullable()->after('driver_dvla_code');
            $table->string('driver_license_front_path')->nullable()->after('driver_utility_bill_path');
            $table->string('driver_license_back_path')->nullable()->after('driver_license_front_path');
            $table->string('driver_passport_path')->nullable()->after('driver_license_back_path');
            $table->string('driver_selfie_path')->nullable()->after('driver_passport_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'driver_dvla_code',
                'driver_utility_bill_path',
                'driver_license_front_path',
                'driver_license_back_path',
                'driver_passport_path',
                'driver_selfie_path',
            ]);
        });
    }
};
