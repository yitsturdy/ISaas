<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// 認証不要
Route::post('/register',    [AuthController::class, 'register']);
Route::post('/login',       [AuthController::class, 'login']);
Route::post('/guest-login', [AuthController::class, 'guestLogin']);

// 要認証
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'me']);
});
