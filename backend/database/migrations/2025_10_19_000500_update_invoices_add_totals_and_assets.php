<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->default(0)->after('status');
            $table->decimal('vat_total', 10, 2)->default(0)->after('subtotal');
            $table->decimal('total', 10, 2)->default(0)->change();
            $table->string('currency', 3)->default('GBP')->after('total');
            $table->timestamp('finalized_at')->nullable()->after('issued_at');
            $table->foreignId('finalized_by_id')->nullable()->after('finalized_at')->constrained('users')->nullOnDelete();
            $table->string('pdf_path')->nullable()->after('notes');
            $table->string('pdf_disk')->nullable()->after('pdf_path');
            $table->string('pdf_hash', 64)->nullable()->after('pdf_disk');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['finalized_by_id']);
            $table->dropColumn([
                'subtotal',
                'vat_total',
                'currency',
                'finalized_at',
                'finalized_by_id',
                'pdf_path',
                'pdf_disk',
                'pdf_hash',
            ]);
            $table->decimal('total', 8, 2)->default(0)->change();
        });
    }
};
