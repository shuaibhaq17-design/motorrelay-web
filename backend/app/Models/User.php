<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'plan'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    protected $appends = [
        'plan_slug',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isDealer(): bool
    {
        return $this->role === 'dealer';
    }

    public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

    public function getPlanSlugAttribute(): ?string
    {
        if (!$this->plan) {
            return null;
        }

        return Str::slug((string) $this->plan, '_');
    }

    protected function normalizedPlan(): string
    {
        return $this->plan_slug ?? '';
    }

    public function hasPaidSubscription(): bool
    {
        $plan = $this->normalizedPlan();
        $paidPlans = collect(config('jobs.paid_plans', []))
            ->map(fn ($value) => Str::slug((string) $value, '_'));

        return $plan !== '' && $paidPlans->contains($plan);
    }

    public function assignedJobs(): HasMany
    {
        return $this->hasMany(Job::class, 'assigned_to_id');
    }

    public function postedJobs(): HasMany
    {
        return $this->hasMany(Job::class, 'posted_by_id');
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class, 'driver_id');
    }
}
