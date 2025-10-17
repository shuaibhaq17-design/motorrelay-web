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
        'notes',
        'posted_by_id',
        'assigned_to_id'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'distance_mi' => 'decimal:1',
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
