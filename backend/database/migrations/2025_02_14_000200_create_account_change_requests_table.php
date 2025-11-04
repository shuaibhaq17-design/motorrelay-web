<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('account_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('payload');
            $table->string('status')->default('pending');
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_change_requests');
    }
};
