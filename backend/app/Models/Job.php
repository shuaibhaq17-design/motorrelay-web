<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Job extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'price',
        'status',
        'company',
        'pickup_label',
        'pickup_postcode',
        'pickup_notes',
        'dropoff_label',
        'dropoff_postcode',
        'dropoff_notes',
        'distance_mi',
        'vehicle_make',
        'vehicle_type',
        'transport_type',
        'notes',
        'posted_by_id',
        'assigned_to_id',
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
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'distance_mi' => 'decimal:1',
        'is_urgent' => 'boolean',
        'urgent_fee_amount' => 'decimal:2',
        'platform_fee_amount' => 'decimal:2',
        'completion_submitted_at' => 'datetime',
        'completion_approved_at' => 'datetime',
        'completion_rejected_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function finalizedInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'finalized_invoice_id');
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->isAdmin()) {
            return $query;
        }

        if ($user->isDealer()) {
            return $query->where('posted_by_id', $user->id);
        }

        return $query->where(function ($inner) use ($user) {
            $inner->whereNull('assigned_to_id')
                ->orWhere('assigned_to_id', $user->id);
        });
    }
}
