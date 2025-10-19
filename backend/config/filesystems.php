<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        'receipts' => [
            'driver' => 'local',
            'root' => storage_path('app/receipts'),
            'visibility' => 'private',
            'throw' => false,
        ],

        'invoices' => [
            'driver' => 'local',
            'root' => storage_path('app/invoices'),
            'visibility' => 'private',
            'throw' => false,
        ],

        'supabase' => [
            'driver' => 's3',
            'key' => env('SUPABASE_ACCESS_KEY'),
            'secret' => env('SUPABASE_SECRET_KEY'),
            'region' => env('SUPABASE_REGION', 'eu-west-1'),
            'bucket' => env('SUPABASE_STORAGE_BUCKET', 'invoices'),
            'endpoint' => env('SUPABASE_STORAGE_ENDPOINT'),
            'use_path_style_endpoint' => true,
            'visibility' => 'private',
            'throw' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
