<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobDailyMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'date',
        'views',
    ];

    public $timestamps = false;

    protected $casts = [
        'date' => 'date',
        'views' => 'integer',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }
}

