<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 放置リードアラートメールを毎朝9時に送信
Schedule::command('leads:send-neglected-alerts')->dailyAt('09:00');
