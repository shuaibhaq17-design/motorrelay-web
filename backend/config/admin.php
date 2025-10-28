<?php

return [
    'plans' => [
        [
            'name' => 'starter',
            'label' => 'Bronze',
            'price_label' => 'Free',
            'monthly_amount' => 0,
            'features' => [
                'Drivers: Access to local job board with 5 applications per day',
                'Drivers: Manual invoice downloads and community support',
                'Dealers: Post up to 5 jobs per month with view analytics',
                'Dealers: Email notifications and a single user seat',
            ],
        ],
        [
            'name' => 'gold_driver',
            'label' => 'Silver',
            'price_label' => 'GBP 29/month',
            'monthly_amount' => 29,
            'features' => [
                'Drivers: Planner dashboard, priority chat, instant payout eligibility',
                'Drivers: Job search radius up to 100 miles',
                'Dealers: Post up to 40 jobs monthly with 2 urgent boosts included',
                'Dealers: Shared inbox for team coordination and invoice exports',
            ],
        ],
        [
            'name' => 'dealer_pro',
            'label' => 'Gold',
            'price_label' => 'GBP 79/month',
            'monthly_amount' => 79,
            'features' => [
                'Drivers: Unlimited job applications with dedicated account support',
                'Drivers: Same day fuel and expense reconciliation plus API hooks',
                'Dealers: Unlimited job posts, workload routing, and integrations',
                'Dealers: Custom webhooks with quarterly optimisation reviews',
            ],
        ],
    ],
    'announcements' => [
        'Improved job matching accuracy',
        'This week: 10% off delivery fees (Fri-Sun)',
        'Live tracking accuracy upgrades',
    ],
    'legal_links' => [
        [
            'label' => 'GDPR Policy',
            'url' => '#',
        ],
        [
            'label' => 'Terms & Conditions',
            'url' => '#',
        ],
        [
            'label' => 'Licensing',
            'url' => '#',
        ],
    ],
    'feature_flags' => [
        [
            'key' => 'newMessaging',
            'label' => 'New messaging',
            'enabled' => true,
        ],
        [
            'key' => 'enableFraudChecks',
            'label' => 'Fraud checks',
            'enabled' => true,
        ],
        [
            'key' => 'betaPlanner',
            'label' => 'Planner beta',
            'enabled' => false,
        ],
    ],
];



