<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'number',
        'status',
        'subtotal',
        'vat_total',
        'total',
        'currency',
        'issued_at',
        'finalized_at',
        'finalized_by_id',
        'notes',
        'pdf_path',
        'pdf_disk',
        'pdf_hash',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'vat_total' => 'decimal:2',
        'total' => 'decimal:2',
        'issued_at' => 'datetime',
        'finalized_at' => 'datetime',
    ];

    protected $appends = [
        'is_finalized',
    ];

    protected static function booted(): void
    {
        static::updating(function (Invoice $invoice) {
            $originalStatus = $invoice->getOriginal('status');
            if ($originalStatus === 'finalized') {
                abort(422, 'Finalized invoices cannot be modified.');
            }
        });
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function getIsFinalizedAttribute(): bool
    {
        return $this->status === 'finalized';
    }
}
