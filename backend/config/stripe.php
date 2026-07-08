<?php

return [
    'secret_key' => env('STRIPE_SECRET_KEY'),
    'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    'platform_fee_percent' => (float) env('STRIPE_PLATFORM_FEE_PERCENT', 10),
    'currency' => env('STRIPE_CURRENCY', 'gbp'),
    'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:5173'),
];

