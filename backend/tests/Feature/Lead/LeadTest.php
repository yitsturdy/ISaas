<?php

namespace Tests\Feature\Lead;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\LeadStage;
use App\Models\LeadStageHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class LeadTest extends TestCase
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

    public function test_index_returns_paginated_leads_with_relations(): void
    {
        $this->asAdmin();
        Lead::factory()->count(3)->create();

        $response = $this->getJson('/api/leads');
        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'total']);

        $first = $response->json('data.0');
        $this->assertArrayHasKey('customer', $first);
        $this->assertArrayHasKey('owner', $first);
        $this->assertArrayHasKey('current_stage', $first);
    }

    public function test_index_filters_by_stage_id(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();
        Lead::factory()->withStage($stage)->count(2)->create();
        Lead::factory()->count(2)->create();

        $response = $this->getJson("/api/leads?stage_id={$stage->id}");
        $response->assertStatus(200);

        foreach ($response->json('data') as $lead) {
            $this->assertEquals($stage->id, $lead['current_stage_id']);
        }
    }

    public function test_index_filters_by_owner_id(): void
    {
        $this->asAdmin();
        $owner = User::factory()->create();
        Lead::factory()->create(['owner_id' => $owner->id]);
        Lead::factory()->count(2)->create();

        $response = $this->getJson("/api/leads?owner_id={$owner->id}");
        $response->assertStatus(200);

        foreach ($response->json('data') as $lead) {
            $this->assertEquals($owner->id, $lead['owner_id']);
        }
    }

    // ---- store ----

    public function test_admin_can_create_lead(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create();

        $this->postJson('/api/leads', [
            'customer_id' => $customer->id,
            'title'       => 'New Lead',
        ])->assertStatus(201)
            ->assertJsonFragment(['title' => 'New Lead']);
    }

    public function test_manager_can_create_lead(): void
    {
        $this->asManager();
        $customer = Customer::factory()->create();

        $this->postJson('/api/leads', [
            'customer_id' => $customer->id,
            'title'       => 'Manager Lead',
        ])->assertStatus(201);
    }

    public function test_is_cannot_create_lead(): void
    {
        $this->asIS();
        $customer = Customer::factory()->create();

        $this->postJson('/api/leads', [
            'customer_id' => $customer->id,
            'title'       => 'IS Lead',
        ])->assertStatus(403);
    }

    public function test_store_with_stage_creates_history(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create();
        $stage    = LeadStage::factory()->create();

        $response = $this->postJson('/api/leads', [
            'customer_id'      => $customer->id,
            'title'            => 'Lead with Stage',
            'current_stage_id' => $stage->id,
        ]);

        $response->assertStatus(201);

        $leadId = $response->json('id');
        $this->assertDatabaseHas('lead_stage_histories', [
            'lead_id'     => $leadId,
            'to_stage_id' => $stage->id,
            'reason_code' => 'created',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->asAdmin();

        $this->postJson('/api/leads', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['customer_id', 'title']);
    }

    public function test_store_validates_customer_exists(): void
    {
        $this->asAdmin();

        $this->postJson('/api/leads', [
            'customer_id' => 99999,
            'title'       => 'Test',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['customer_id']);
    }

    // ---- show ----

    public function test_show_returns_lead_with_all_relations(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();
        $lead  = Lead::factory()->withStage($stage)->create();

        $response = $this->getJson("/api/leads/{$lead->id}");
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertArrayHasKey('customer', $data);
        $this->assertArrayHasKey('stage_histories', $data);
    }

    // ---- destroy ----

    public function test_admin_can_delete_lead(): void
    {
        $admin = $this->asAdmin();
        $lead  = Lead::factory()->create();

        $this->deleteJson("/api/leads/{$lead->id}")->assertStatus(200);
        $this->assertDatabaseMissing('leads', ['id' => $lead->id]);
    }

    public function test_non_admin_cannot_delete_lead(): void
    {
        $lead = Lead::factory()->create();

        $this->asManager();
        $this->deleteJson("/api/leads/{$lead->id}")->assertStatus(403);

        $this->asIS();
        $this->deleteJson("/api/leads/{$lead->id}")->assertStatus(403);
    }

    // ---- transition ----

    public function test_transition_changes_stage_and_creates_history(): void
    {
        $admin    = $this->asAdmin();
        $fromStage = LeadStage::factory()->create();
        $toStage   = LeadStage::factory()->create();
        $lead      = Lead::factory()->withStage($fromStage)->create();

        $this->postJson("/api/leads/{$lead->id}/transition", [
            'to_stage_id' => $toStage->id,
        ])->assertStatus(200);

        $this->assertDatabaseHas('leads', [
            'id'               => $lead->id,
            'current_stage_id' => $toStage->id,
        ]);

        $this->assertDatabaseHas('lead_stage_histories', [
            'lead_id'       => $lead->id,
            'from_stage_id' => $fromStage->id,
            'to_stage_id'   => $toStage->id,
        ]);
    }

    public function test_transition_to_same_stage_returns_422(): void
    {
        $this->asAdmin();
        $stage = LeadStage::factory()->create();
        $lead  = Lead::factory()->withStage($stage)->create();

        $this->postJson("/api/leads/{$lead->id}/transition", [
            'to_stage_id' => $stage->id,
        ])->assertStatus(422);
    }

    // ---- assign ----

    public function test_admin_can_assign_lead(): void
    {
        $this->asAdmin();
        $lead     = Lead::factory()->create();
        $newOwner = User::factory()->create();

        $this->patchJson("/api/leads/{$lead->id}/assign", [
            'owner_id' => $newOwner->id,
        ])->assertStatus(200)
            ->assertJsonFragment(['owner_id' => $newOwner->id]);
    }

    public function test_manager_can_assign_lead(): void
    {
        $this->asManager();
        $lead     = Lead::factory()->create();
        $newOwner = User::factory()->create();

        $this->patchJson("/api/leads/{$lead->id}/assign", [
            'owner_id' => $newOwner->id,
        ])->assertStatus(200);
    }

    public function test_is_cannot_assign_lead(): void
    {
        $this->asIS();
        $lead = Lead::factory()->create();

        $this->patchJson("/api/leads/{$lead->id}/assign", [
            'owner_id' => null,
        ])->assertStatus(403);
    }

    public function test_assign_accepts_null_owner(): void
    {
        $this->asAdmin();
        $lead = Lead::factory()->create();

        $this->patchJson("/api/leads/{$lead->id}/assign", [
            'owner_id' => null,
        ])->assertStatus(200)
            ->assertJsonFragment(['owner_id' => null]);
    }

    // ---- export ----

    public function test_export_returns_csv_response(): void
    {
        $this->asAdmin();
        Lead::factory()->count(2)->create();

        $response = $this->get('/api/leads/export', [
            'Accept' => 'text/csv',
        ]);

        $response->assertStatus(200);
        $this->assertStringStartsWith('text/csv', $response->headers->get('Content-Type'));

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
    }

    // ---- import ----

    public function test_import_creates_leads_from_csv(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create(['name' => 'インポート顧客']);

        $csv = "タイトル,顧客名,担当者,ステージ,メモ\n"
            . "テストリード,インポート顧客,,,\n";

        $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

        $response = $this->postJson('/api/leads/import', ['file' => $file]);
        $response->assertStatus(200)
            ->assertJsonStructure(['success_count', 'errors']);

        $this->assertEquals(1, $response->json('success_count'));
    }

    public function test_import_errors_on_missing_customer(): void
    {
        $this->asAdmin();

        $csv = "タイトル,顧客名\n"
            . "テストリード,存在しない顧客\n";

        $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

        $response = $this->postJson('/api/leads/import', ['file' => $file]);
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('errors'));
    }

    public function test_import_errors_on_missing_title(): void
    {
        $this->asAdmin();
        Customer::factory()->create(['name' => 'テスト顧客']);

        $csv = "タイトル,顧客名\n"
            . ",テスト顧客\n";

        $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

        $response = $this->postJson('/api/leads/import', ['file' => $file]);
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('errors'));
    }
}
