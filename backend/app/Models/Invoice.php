<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'number',
        'status',
        'total',
        'issued_at',
        'notes'
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'issued_at' => 'datetime'
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }
}
