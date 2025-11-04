<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('plan');
            $table->string('company')->nullable()->after('phone');
            $table->string('address_line_one')->nullable()->after('company');
            $table->string('address_line_two')->nullable()->after('address_line_one');
            $table->string('city')->nullable()->after('address_line_two');
            $table->string('postcode')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'company',
                'address_line_one',
                'address_line_two',
                'city',
                'postcode',
            ]);
        });
    }
};
