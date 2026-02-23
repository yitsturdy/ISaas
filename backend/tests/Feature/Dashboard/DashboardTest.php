<?php

namespace Tests\Feature\Dashboard;

use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function asAdmin(): User
    {
        $user = User::factory()->admin()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    private function asIS(): User
    {
        $user = User::factory()->is()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    // ---- index ----

    public function test_index_returns_kpi_statistics(): void
    {
        $this->asAdmin();

        $this->getJson('/api/dashboard')
            ->assertStatus(200)
            ->assertJsonStructure([
                'total_leads',
                'active_leads',
                'won_leads',
                'conversion_rate',
                'neglected_leads_count',
                'leads_by_stage',
            ]);
    }

    public function test_index_calculates_conversion_rate(): void
    {
        $this->asAdmin();

        $wonStage = LeadStage::factory()->closed()->create();
        Lead::factory()->withStage($wonStage)->count(2)->create();
        Lead::factory()->count(8)->create(); // 合計 10

        $response = $this->getJson('/api/dashboard');
        $response->assertStatus(200);

        $this->assertEquals(20.0, $response->json('conversion_rate'));
        $this->assertEquals(10, $response->json('total_leads'));
        $this->assertEquals(2, $response->json('won_leads'));
    }

    public function test_index_counts_neglected_leads(): void
    {
        $this->asAdmin();

        // threshold = 7 日のステージ
        $stage = LeadStage::factory()->withThreshold(7)->create();

        // 8 日前に活動 → 放置リード
        Lead::factory()->withStage($stage)->neglected(8)->count(2)->create();
        // 3 日前に活動 → 放置でない
        Lead::factory()->withStage($stage)->neglected(3)->count(1)->create();

        $response = $this->getJson('/api/dashboard');
        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('neglected_leads_count'));
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/dashboard')->assertStatus(401);
    }

    // ---- performance ----

    public function test_performance_admin_sees_all_is_users(): void
    {
        $this->asAdmin();
        User::factory()->is()->count(3)->create();

        $response = $this->getJson('/api/dashboard/performance');
        $response->assertStatus(200);

        $this->assertCount(3, $response->json());
    }

    public function test_performance_is_sees_only_self(): void
    {
        $me = $this->asIS();
        User::factory()->is()->count(2)->create(); // 他の IS ユーザー

        $response = $this->getJson('/api/dashboard/performance');
        $response->assertStatus(200);

        $this->assertCount(1, $response->json());
        $this->assertEquals($me->id, $response->json('0.user_id'));
    }

    public function test_performance_calculates_achievement_rate(): void
    {
        $this->asAdmin();

        $wonStage = LeadStage::factory()->closed()->create();
        $isUser   = User::factory()->is()->create(['monthly_target_count' => 10]);
        Lead::factory()->withStage($wonStage)->create(['owner_id' => $isUser->id]);
        Lead::factory()->withStage($wonStage)->create(['owner_id' => $isUser->id]);

        $response = $this->getJson('/api/dashboard/performance');
        $response->assertStatus(200);

        $data = collect($response->json())->firstWhere('user_id', $isUser->id);
        $this->assertNotNull($data);
        $this->assertEquals(20.0, $data['achievement_rate']);
        $this->assertEquals(2, $data['won_leads_count']);
    }

    public function test_performance_requires_authentication(): void
    {
        $this->getJson('/api/dashboard/performance')->assertStatus(401);
    }

    // ---- neglectedLeads ----

    public function test_neglected_leads_returns_overdue_leads(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->withThreshold(7)->create();
        Lead::factory()->withStage($stage)->neglected(10)->count(2)->create();

        $response = $this->getJson('/api/dashboard/neglected-leads');
        $response->assertStatus(200);

        $this->assertCount(2, $response->json());
        $this->assertArrayHasKey('days_since_last_activity', $response->json('0'));
        $this->assertArrayHasKey('threshold_days', $response->json('0'));
    }

    public function test_neglected_leads_admin_sees_all(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->withThreshold(7)->create();

        $owner1 = User::factory()->is()->create();
        $owner2 = User::factory()->is()->create();
        Lead::factory()->withStage($stage)->neglected(10)->create(['owner_id' => $owner1->id]);
        Lead::factory()->withStage($stage)->neglected(10)->create(['owner_id' => $owner2->id]);

        $response = $this->getJson('/api/dashboard/neglected-leads');
        $response->assertStatus(200);
        $this->assertCount(2, $response->json());
    }

    public function test_neglected_leads_is_sees_only_own(): void
    {
        $me    = $this->asIS();
        $stage = LeadStage::factory()->withThreshold(7)->create();
        $other = User::factory()->is()->create();

        Lead::factory()->withStage($stage)->neglected(10)->create(['owner_id' => $me->id]);
        Lead::factory()->withStage($stage)->neglected(10)->create(['owner_id' => $other->id]);

        $response = $this->getJson('/api/dashboard/neglected-leads');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
        $this->assertEquals($me->name, $response->json('0.owner_name'));
    }

    public function test_neglected_leads_sorted_descending(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->withThreshold(7)->create();

        Lead::factory()->withStage($stage)->neglected(8)->create();  // 超過 1 日
        Lead::factory()->withStage($stage)->neglected(20)->create(); // 超過 13 日
        Lead::factory()->withStage($stage)->neglected(12)->create(); // 超過 5 日

        $response = $this->getJson('/api/dashboard/neglected-leads');
        $response->assertStatus(200);

        $days = array_column($response->json(), 'days_since_last_activity');
        // 超過日数降順 = days 降順であることを確認
        $sorted = $days;
        rsort($sorted);
        $this->assertEquals($sorted, $days);
    }

    public function test_neglected_leads_requires_authentication(): void
    {
        $this->getJson('/api/dashboard/neglected-leads')->assertStatus(401);
    }
}
