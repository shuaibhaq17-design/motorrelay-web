<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Job;
use App\Models\Message;
use App\Models\MessageThread;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@motorrelay.com'],
            [
                'name' => 'MotorRelay Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'plan' => 'Dealer Pro',
            ]
        );

        $dealer = User::firstOrCreate(
            ['email' => 'dealer@motorrelay.com'],
            [
                'name' => 'Demo Dealer',
                'password' => Hash::make('password'),
                'role' => 'dealer',
                'plan' => 'Starter',
            ]
        );

        $driver = User::firstOrCreate(
            ['email' => 'driver@motorrelay.com'],
            [
                'name' => 'Demo Driver',
                'password' => Hash::make('password'),
                'role' => 'driver',
                'plan' => 'Gold Driver',
            ]
        );

        $jobs = Job::factory()->count(5)->create([
            'posted_by_id' => $dealer->id,
            'assigned_to_id' => $driver->id,
            'status' => 'delivered'
        ]);

        $openJob = Job::factory()->create([
            'posted_by_id' => $dealer->id,
            'assigned_to_id' => null,
            'status' => 'open',
            'title' => 'Deliver Audi Q5 to Birmingham'
        ]);

        $thread = MessageThread::create([
            'subject' => 'Delivery updates'
        ]);

        $thread->participants()->sync([$dealer->id, $driver->id]);

        Message::create([
            'message_thread_id' => $thread->id,
            'user_id' => $dealer->id,
            'body' => 'Vehicle ready for collection at 9am tomorrow.'
        ]);

        Message::create([
            'message_thread_id' => $thread->id,
            'user_id' => $driver->id,
            'body' => 'Great, will collect as scheduled.'
        ]);

        Invoice::create([
            'job_id' => $jobs->first()?->id ?? $openJob->id,
            'number' => 'INV-20240101-DEMO',
            'status' => 'paid',
            'total' => 120.00,
            'issued_at' => now()->subDays(2),
            'notes' => 'Thanks for choosing MotorRelay.'
        ]);
    }
}
