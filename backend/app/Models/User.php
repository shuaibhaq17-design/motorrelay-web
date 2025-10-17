<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
