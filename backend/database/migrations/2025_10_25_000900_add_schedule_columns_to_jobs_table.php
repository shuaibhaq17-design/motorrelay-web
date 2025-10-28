<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->timestamp('pickup_ready_at')->nullable()->after('pickup_notes');
            $table->timestamp('delivery_due_at')->nullable()->after('pickup_ready_at');
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropColumn(['pickup_ready_at', 'delivery_due_at']);
        });
    }
};

