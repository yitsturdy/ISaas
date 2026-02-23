<?php

namespace Tests\Feature\LeadStage;

use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadStageTest extends TestCase
{
    use RefreshDatabase;

    private function asAdmin(): User
    {
        $user = User::factory()->admin()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    private function asManager(): User
    {
        $user = User::factory()->manager()->create();
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

    public function test_index_returns_stages_ordered_by_display_order(): void
    {
        $this->asAdmin();
        LeadStage::factory()->create(['display_order' => 3]);
        LeadStage::factory()->create(['display_order' => 1]);
        LeadStage::factory()->create(['display_order' => 2]);

        $response = $this->getJson('/api/lead-stages');
        $response->assertStatus(200);

        $orders = array_column($response->json(), 'display_order');
        $sorted = $orders;
        sort($sorted);
        $this->assertEquals($sorted, $orders);
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/lead-stages')->assertStatus(401);
    }

    // ---- store ----

    public function test_admin_can_create_stage(): void
    {
        $this->asAdmin();

        $this->postJson('/api/lead-stages', [
            'name'          => 'テストステージ',
            'display_order' => 5,
            'is_active'     => true,
        ])->assertStatus(201)
            ->assertJsonFragment(['name' => 'テストステージ']);
    }

    public function test_non_admin_cannot_create_stage(): void
    {
        $this->asManager();
        $this->postJson('/api/lead-stages', [
            'name'          => 'Stage',
            'display_order' => 1,
        ])->assertStatus(403);

        $this->asIS();
        $this->postJson('/api/lead-stages', [
            'name'          => 'Stage',
            'display_order' => 1,
        ])->assertStatus(403);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->asAdmin();

        $this->postJson('/api/lead-stages', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'display_order']);
    }

    // ---- show ----

    public function test_show_returns_stage(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();

        $this->getJson("/api/lead-stages/{$stage->id}")
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $stage->id]);
    }

    // ---- update ----

    public function test_admin_can_update_stage(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();

        $this->putJson("/api/lead-stages/{$stage->id}", [
            'name' => '更新後ステージ',
        ])->assertStatus(200)
            ->assertJsonFragment(['name' => '更新後ステージ']);
    }

    public function test_non_admin_cannot_update_stage(): void
    {
        $stage = LeadStage::factory()->create();

        $this->asManager();
        $this->putJson("/api/lead-stages/{$stage->id}", ['name' => 'X'])->assertStatus(403);

        $this->asIS();
        $this->putJson("/api/lead-stages/{$stage->id}", ['name' => 'X'])->assertStatus(403);
    }

    // ---- destroy ----

    public function test_admin_can_delete_unlinked_stage(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();

        $this->deleteJson("/api/lead-stages/{$stage->id}")->assertStatus(200);
        $this->assertDatabaseMissing('lead_stages', ['id' => $stage->id]);
    }

    public function test_cannot_delete_stage_with_leads(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();
        Lead::factory()->withStage($stage)->create();

        $this->deleteJson("/api/lead-stages/{$stage->id}")->assertStatus(422);
    }

    public function test_non_admin_cannot_delete_stage(): void
    {
        $stage = LeadStage::factory()->create();

        $this->asManager();
        $this->deleteJson("/api/lead-stages/{$stage->id}")->assertStatus(403);
    }
}
