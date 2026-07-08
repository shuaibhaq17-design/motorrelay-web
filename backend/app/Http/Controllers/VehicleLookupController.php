<?php

namespace App\Http\Controllers;

use App\Services\VehicleLookupService;
use Illuminate\Http\JsonResponse;

class VehicleLookupController extends Controller
{
    public function show(string $registration, VehicleLookupService $vehicles): JsonResponse
    {
        return response()->json([
            'data' => $vehicles->lookup($registration),
        ]);
    }
}
