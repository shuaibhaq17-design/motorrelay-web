<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'driver_id',
        'description',
        'amount',
        'vat_rate',
        'receipt_path',
        'receipt_disk',
        'status',
        'reviewed_by_id',
        'review_note',
        'submitted_at',
        'reviewed_at',
        'locked_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'locked_at' => 'datetime',
    ];

    protected $appends = [
        'vat_amount',
        'total_amount',
        'is_editable',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function getVatAmountAttribute(): float
    {
        $amount = (float) ($this->attributes['amount'] ?? 0);
        $vatRate = (float) ($this->attributes['vat_rate'] ?? 0);
        return round($amount * ($vatRate / 100), 2);
    }

    public function getTotalAmountAttribute(): float
    {
        return round((float) ($this->attributes['amount'] ?? 0) + $this->vat_amount, 2);
    }

    public function getIsEditableAttribute(): bool
    {
        if ($this->status !== 'submitted') {
            return false;
        }

        if ($this->locked_at) {
            return false;
        }

        return true;
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }
}
