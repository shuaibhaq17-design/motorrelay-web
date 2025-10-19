<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->boolean('is_urgent')->default(false)->after('notes');
            $table->decimal('urgent_fee_amount', 10, 2)->default(0)->after('is_urgent');
            $table->decimal('platform_fee_amount', 10, 2)->default(0)->after('urgent_fee_amount');
            $table->string('platform_fee_reference')->nullable()->after('platform_fee_amount');
            $table->string('completion_status')->default('not_submitted')->after('platform_fee_reference');
            $table->timestamp('completion_submitted_at')->nullable()->after('completion_status');
            $table->text('completion_notes')->nullable()->after('completion_submitted_at');
            $table->timestamp('completion_approved_at')->nullable()->after('completion_notes');
            $table->timestamp('completion_rejected_at')->nullable()->after('completion_approved_at');
            $table->string('delivery_proof_path')->nullable()->after('completion_rejected_at');
            $table->string('delivery_proof_disk')->nullable()->after('delivery_proof_path');
            $table->timestamp('completed_at')->nullable()->after('delivery_proof_disk');
            $table->foreignId('finalized_invoice_id')->nullable()->after('completed_at')->constrained('invoices')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropForeign(['finalized_invoice_id']);
            $table->dropColumn([
                'is_urgent',
                'urgent_fee_amount',
                'platform_fee_amount',
                'platform_fee_reference',
                'completion_status',
                'completion_submitted_at',
                'completion_notes',
                'completion_approved_at',
                'completion_rejected_at',
                'delivery_proof_path',
                'delivery_proof_disk',
                'completed_at',
                'finalized_invoice_id',
            ]);
        });
    }
};
