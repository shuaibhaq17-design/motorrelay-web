<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
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
        'plan',
        'phone',
        'company',
        'address_line_one',
        'address_line_two',
        'city',
        'postcode',
        'company_number',
        'trade_policy_path',
        'trade_plate_photo_path',
        'utility_bill_path',
        'passport_number',
        'passport_selfie_path',
        'driver_dvla_code',
        'driver_utility_bill_path',
        'driver_license_front_path',
        'driver_license_back_path',
        'driver_passport_path',
        'driver_selfie_path'
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
        'trade_policy_url',
        'trade_plate_photo_url',
        'utility_bill_url',
        'passport_selfie_url',
        'driver_utility_bill_url',
        'driver_license_front_url',
        'driver_license_back_url',
        'driver_passport_url',
        'driver_selfie_url',
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

    public function accountChangeRequests(): HasMany
    {
        return $this->hasMany(AccountChangeRequest::class);
    }

    public function getTradePolicyUrlAttribute(): ?string
    {
        return $this->documentUrl($this->trade_policy_path);
    }

    public function getTradePlatePhotoUrlAttribute(): ?string
    {
        return $this->documentUrl($this->trade_plate_photo_path);
    }

    public function getUtilityBillUrlAttribute(): ?string
    {
        return $this->documentUrl($this->utility_bill_path);
    }

    public function getPassportSelfieUrlAttribute(): ?string
    {
        return $this->documentUrl($this->passport_selfie_path);
    }

    public function getDriverUtilityBillUrlAttribute(): ?string
    {
        return $this->documentUrl($this->driver_utility_bill_path);
    }

    public function getDriverLicenseFrontUrlAttribute(): ?string
    {
        return $this->documentUrl($this->driver_license_front_path);
    }

    public function getDriverLicenseBackUrlAttribute(): ?string
    {
        return $this->documentUrl($this->driver_license_back_path);
    }

    public function getDriverPassportUrlAttribute(): ?string
    {
        return $this->documentUrl($this->driver_passport_path);
    }

    public function getDriverSelfieUrlAttribute(): ?string
    {
        return $this->documentUrl($this->driver_selfie_path);
    }

    protected function documentUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $disk = config('filesystems.default', 'public');

        try {
            return Storage::disk($disk)->url($path);
        } catch (\Throwable) {
            return null;
        }
    }
}
