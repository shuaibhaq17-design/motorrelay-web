<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'Deliver ' . $this->faker->randomElement(['Ford Fiesta', 'BMW 1 Series', 'Audi A4', 'Tesla Model 3']),
            'price' => $this->faker->numberBetween(60, 180),
            'status' => 'open',
            'goes_live_at' => now()->subMinutes($this->faker->numberBetween(5, 120)),
            'company' => $this->faker->company(),
            'pickup_label' => $this->faker->city(),
            'pickup_postcode' => strtoupper($this->faker->bothify('??## ??')),
            'pickup_ready_at' => now()->addHours($this->faker->numberBetween(1, 12)),
            'delivery_due_at' => now()->addHours($this->faker->numberBetween(24, 72)),
            'dropoff_label' => $this->faker->city(),
            'dropoff_postcode' => strtoupper($this->faker->bothify('??## ??')),
            'distance_mi' => $this->faker->numberBetween(5, 120),
            'vehicle_make' => $this->faker->randomElement(['Ford', 'BMW', 'Audi', 'Tesla']),
            'vehicle_type' => $this->faker->randomElement(['Saloon', 'SUV', 'Hatchback']),
            'notes' => $this->faker->sentence(8),
            'posted_by_id' => User::factory(),
            'assigned_to_id' => null,
        ];
    }
}
