<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DriverDashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\JobWorkflowController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserProfileController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/jobs/highlights', [JobController::class, 'highlights']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/profile', [UserProfileController::class, 'show']);
    Route::get('/driver/overview', [DriverDashboardController::class, 'show']);

    Route::get('/jobs', [JobController::class, 'index']);
    Route::post('/jobs', [JobController::class, 'store']);
    Route::get('/jobs/{job}', [JobController::class, 'show']);
    Route::patch('/jobs/{job}', [JobController::class, 'update']);
    Route::delete('/jobs/{job}', [JobController::class, 'destroy']);

    Route::get('/jobs/{job}/applications', [JobApplicationController::class, 'index']);
    Route::post('/jobs/{job}/applications', [JobApplicationController::class, 'store']);
    Route::patch('/jobs/{job}/applications/{application}', [JobApplicationController::class, 'update']);

    Route::post('/jobs/{job}/accept', [JobWorkflowController::class, 'accept']);
    Route::post('/jobs/{job}/collected', [JobWorkflowController::class, 'collected']);
    Route::post('/jobs/{job}/delivered', [JobWorkflowController::class, 'delivered']);
    Route::post('/jobs/{job}/cancel', [JobWorkflowController::class, 'cancel']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::get('/messages/threads/{thread}', [MessageController::class, 'show']);
    Route::post('/messages/{message}/view', [MessageController::class, 'markAsViewed']);

    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices/from-job/{job}', [InvoiceController::class, 'storeFromJob']);
});
