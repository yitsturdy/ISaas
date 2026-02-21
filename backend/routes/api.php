<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
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

    // 顧客管理
    Route::apiResource('customers', CustomerController::class);
});
