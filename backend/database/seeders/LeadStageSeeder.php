<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeadStageSeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            ['name' => 'アプローチ前',     'display_order' => 1, 'is_active' => true, 'reassignment_threshold_days' => 30],
            ['name' => 'アプローチ中',     'display_order' => 2, 'is_active' => true, 'reassignment_threshold_days' => 14],
            ['name' => '商談設定済み',     'display_order' => 3, 'is_active' => true, 'reassignment_threshold_days' => 7],
            ['name' => '商談中',           'display_order' => 4, 'is_active' => true, 'reassignment_threshold_days' => 14],
            ['name' => '提案済み',         'display_order' => 5, 'is_active' => true, 'reassignment_threshold_days' => 21],
            ['name' => 'クローズ（成約）', 'display_order' => 6, 'is_active' => true, 'reassignment_threshold_days' => null],
            ['name' => 'クローズ（失注）', 'display_order' => 7, 'is_active' => true, 'reassignment_threshold_days' => null],
        ];

        foreach ($stages as $stage) {
            DB::table('lead_stages')->insertOrIgnore(array_merge($stage, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
