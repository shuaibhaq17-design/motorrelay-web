<?php

return [
    'urgent_boost_fee' => env('MOTORRELAY_URGENT_FEE', 25.00),

    'paid_plans' => [
        'gold_driver',
        'dealer_pro',
    ],

    'plan_limits' => [
        'starter' => [
            'monthly_job_posts' => 5,
            'urgent_boost_per_month' => 1,
            'daily_applications' => 3,
            'message_cooldown_hours' => 24,
            'max_expenses_per_job' => 10,
            'job_distance_radius' => 50,
        ],
    ],
];
