<?php

namespace App\Http\Controllers;

use App\Services\PostcodeLookupService;
use Illuminate\Http\JsonResponse;

class PostcodeLookupController extends Controller
{
    public function show(string $postcode, PostcodeLookupService $postcodes): JsonResponse
    {
        return response()->json([
            'data' => $postcodes->find($postcode),
        ]);
    }
}
