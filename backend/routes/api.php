<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LeadStageController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// 認証不要
Route::post('/register',    [AuthController::class, 'register']);
Route::post('/login',       [AuthController::class, 'login']);
Route::post('/guest-login', [AuthController::class, 'guestLogin']);

// 要認証
Route::middleware('auth:sanctum')->group(function () {
    // 認証
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'me']);

    // ユーザー管理
    Route::apiResource('users',     UserController::class);

    // 顧客管理（export/importをapiResourceより先に定義）
    Route::get('customers/export',  [CustomerController::class, 'export']);
    Route::post('customers/import', [CustomerController::class, 'import']);
    Route::apiResource('customers', CustomerController::class);

    // リード管理（export/importをapiResourceより先に定義）
    Route::get('leads/export',  [LeadController::class, 'export']);
    Route::post('leads/import', [LeadController::class, 'import']);
    Route::apiResource('leads', LeadController::class);
    Route::post('leads/{lead}/transition', [LeadController::class, 'transition']);
    Route::patch('leads/{lead}/assign',    [LeadController::class, 'assign']);

    // リードステージ管理
    Route::apiResource('lead-stages', LeadStageController::class);

    // ダッシュボード
    Route::get('dashboard',                 [DashboardController::class, 'index']);
    Route::get('dashboard/performance',     [DashboardController::class, 'performance']);
    Route::get('dashboard/neglected-leads', [DashboardController::class, 'neglectedLeads']);
});
