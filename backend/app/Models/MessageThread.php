<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessageThread extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject'
    ];

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_thread_user');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
