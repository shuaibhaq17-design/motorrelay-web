<?php

return [
    'token_url' => env('MOT_HISTORY_TOKEN_URL', 'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token'),
    'api_url' => env('MOT_HISTORY_API_URL', 'https://history.mot.api.gov.uk/v1/trade'),
    'api_key' => env('MOT_HISTORY_API_KEY'),
    'client_id' => env('MOT_HISTORY_CLIENT_ID'),
    'client_secret' => env('MOT_HISTORY_CLIENT_SECRET'),
    'scope' => env('MOT_HISTORY_SCOPE', 'https://tapi.dvsa.gov.uk/.default'),
];
