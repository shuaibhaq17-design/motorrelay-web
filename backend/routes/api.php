<?php

use App\Http\Controllers\AccountChangeRequestController;
use App\Http\Controllers\AdminAccountChangeController;
use App\Http\Controllers\AdminPortalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DriverDashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\JobWorkflowController;
use App\Http\Controllers\JobTrackingController;
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
    Route::get('/account/change-requests', [AccountChangeRequestController::class, 'index']);
    Route::post('/account/change-requests', [AccountChangeRequestController::class, 'store']);

    Route::get('/jobs', [JobController::class, 'index']);
    Route::post('/jobs', [JobController::class, 'store']);
    Route::get('/jobs/{job}', [JobController::class, 'show']);
    Route::patch('/jobs/{job}', [JobController::class, 'update']);
    Route::delete('/jobs/{job}', [JobController::class, 'destroy']);

    Route::post('/jobs/{job}/invoice/send', [InvoiceController::class, 'sendFromJob']);

    Route::get('/jobs/{job}/expenses', [ExpenseController::class, 'index']);
    Route::post('/jobs/{job}/expenses', [ExpenseController::class, 'store']);
    Route::patch('/jobs/{job}/expenses/{expense}', [ExpenseController::class, 'update']);
    Route::delete('/jobs/{job}/expenses/{expense}', [ExpenseController::class, 'destroy']);
    Route::post('/jobs/{job}/expenses/{expense}/decision', [ExpenseController::class, 'decide']);
    Route::get('/jobs/{job}/expenses/{expense}/receipt', [ExpenseController::class, 'receipt']);

    Route::get('/jobs/{job}/applications', [JobApplicationController::class, 'index']);
    Route::post('/jobs/{job}/applications', [JobApplicationController::class, 'store']);
    Route::patch('/jobs/{job}/applications/{application}', [JobApplicationController::class, 'update']);

    Route::post('/jobs/{job}/accept', [JobWorkflowController::class, 'accept']);
    Route::post('/jobs/{job}/collected', [JobWorkflowController::class, 'collected']);
    Route::post('/jobs/{job}/delivered', [JobWorkflowController::class, 'delivered']);
    Route::post('/jobs/{job}/cancel', [JobWorkflowController::class, 'cancel']);
    Route::post('/jobs/{job}/complete', [JobWorkflowController::class, 'complete']);
    Route::post('/jobs/{job}/completion/approve', [JobWorkflowController::class, 'approveCompletion']);
    Route::post('/jobs/{job}/completion/reject', [JobWorkflowController::class, 'rejectCompletion']);
    Route::post('/jobs/{job}/dealer-complete', [JobWorkflowController::class, 'dealerComplete']);
    Route::post('/jobs/{job}/location-update', [JobTrackingController::class, 'store']);
    Route::get('/jobs/{job}/delivery-proof', [JobWorkflowController::class, 'deliveryProof']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::get('/messages/threads/{thread}', [MessageController::class, 'show']);
    Route::post('/messages/{message}/view', [MessageController::class, 'markAsViewed']);

    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::get('/invoices/{invoice}/download', [InvoiceController::class, 'download']);
    Route::get('/invoices/{invoice}/verify', [InvoiceController::class, 'verify']);

    Route::get('/admin/dashboard', [AdminPortalController::class, 'dashboard']);
    Route::get('/admin/account-change-requests', [AdminAccountChangeController::class, 'index']);
    Route::post('/admin/account-change-requests/{accountChangeRequest}/decision', [AdminAccountChangeController::class, 'decide']);
});
