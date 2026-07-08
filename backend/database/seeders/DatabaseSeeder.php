<?php

namespace Database\Seeders;

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

        //
    }
}
