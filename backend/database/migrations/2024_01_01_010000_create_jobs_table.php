<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('posted_by_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->decimal('price', 8, 2)->default(0);
            $table->string('status')->default('open');
            $table->string('company')->nullable();
            $table->string('pickup_label');
            $table->string('pickup_postcode');
            $table->text('pickup_notes')->nullable();
            $table->string('dropoff_label');
            $table->string('dropoff_postcode');
            $table->text('dropoff_notes')->nullable();
            $table->decimal('distance_mi', 6, 1)->nullable();
            $table->string('vehicle_make')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};
