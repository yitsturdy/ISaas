<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class GuestUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'guest@example.com'],
            [
                'name'     => 'ゲストユーザー',
                'password' => 'guest1234',
            ]
        );
    }
}
