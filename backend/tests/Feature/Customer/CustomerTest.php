<?php

namespace Tests\Feature\Customer;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CustomerTest extends TestCase
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

    public function test_index_returns_paginated_customers(): void
    {
        $this->asAdmin();
        Customer::factory()->count(3)->create();

        $this->getJson('/api/customers')
            ->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
    }

    public function test_index_searches_by_name_or_domain(): void
    {
        $this->asAdmin();
        Customer::factory()->create(['name' => 'TargetCorp', 'domain' => 'other.jp']);
        Customer::factory()->count(2)->create();

        $response = $this->getJson('/api/customers?search=TargetCorp');
        $response->assertStatus(200);
        $this->assertGreaterThan(0, count($response->json('data')));
    }

    public function test_index_filters_by_industry_category(): void
    {
        $this->asAdmin();
        Customer::factory()->create(['industry_category' => 'IT・テクノロジー']);
        Customer::factory()->create(['industry_category' => '製造業']);

        $response = $this->getJson('/api/customers?industry_category=' . urlencode('IT・テクノロジー'));
        $response->assertStatus(200);

        foreach ($response->json('data') as $c) {
            $this->assertEquals('IT・テクノロジー', $c['industry_category']);
        }
    }

    public function test_index_filters_by_service_tier(): void
    {
        $this->asAdmin();
        Customer::factory()->create(['service_tier' => 'A']);
        Customer::factory()->tierC()->count(2)->create();

        $response = $this->getJson('/api/customers?service_tier=A');
        $response->assertStatus(200);

        foreach ($response->json('data') as $c) {
            $this->assertEquals('A', $c['service_tier']);
        }
    }

    // ---- store ----

    public function test_admin_can_create_customer(): void
    {
        $this->asAdmin();

        $this->postJson('/api/customers', [
            'name'         => 'New Corp',
            'service_tier' => 'B',
        ])->assertStatus(201)
            ->assertJsonFragment(['name' => 'New Corp']);
    }

    public function test_manager_can_create_customer(): void
    {
        $this->asManager();

        $this->postJson('/api/customers', [
            'name'         => 'Manager Corp',
            'service_tier' => 'C',
        ])->assertStatus(201);
    }

    public function test_is_cannot_create_customer(): void
    {
        $this->asIS();

        $this->postJson('/api/customers', [
            'name'         => 'IS Corp',
            'service_tier' => 'A',
        ])->assertStatus(403);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->asAdmin();

        $this->postJson('/api/customers', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'service_tier']);
    }

    // ---- show ----

    public function test_show_returns_customer(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create();

        $this->getJson("/api/customers/{$customer->id}")
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $customer->id]);
    }

    // ---- update ----

    public function test_update_modifies_customer(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create();

        $this->putJson("/api/customers/{$customer->id}", [
            'name' => 'Updated Corp',
        ])->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Corp']);
    }

    public function test_is_cannot_update_customer(): void
    {
        $this->asIS();
        $customer = Customer::factory()->create();

        $this->putJson("/api/customers/{$customer->id}", [
            'name' => 'Hacked',
        ])->assertStatus(403);
    }

    // ---- destroy ----

    public function test_admin_can_delete_customer(): void
    {
        $this->asAdmin();
        $customer = Customer::factory()->create();

        $this->deleteJson("/api/customers/{$customer->id}")->assertStatus(200);
        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_non_admin_cannot_delete_customer(): void
    {
        $customer = Customer::factory()->create();

        $this->asManager();
        $this->deleteJson("/api/customers/{$customer->id}")->assertStatus(403);
    }

    // ---- export ----

    public function test_export_returns_csv_with_bom(): void
    {
        $this->asAdmin();
        Customer::factory()->count(2)->create();

        $response = $this->get('/api/customers/export', [
            'Accept' => 'text/csv',
        ]);

        $response->assertStatus(200);
        $this->assertStringStartsWith('text/csv', $response->headers->get('Content-Type'));

        $content = $response->streamedContent();
        // BOM チェック（UTF-8 BOM: EF BB BF）
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
    }

    // ---- import ----

    public function test_import_creates_customers_from_csv(): void
    {
        $this->asAdmin();

        $csv = "\xEF\xBB\xBF会社名,サービスティア\n"
            . "テスト株式会社,A\n"
            . "サンプル社,B\n";

        $file = UploadedFile::fake()->createWithContent('customers.csv', $csv);

        $response = $this->postJson('/api/customers/import', ['file' => $file]);
        $response->assertStatus(200)
            ->assertJsonStructure(['success_count', 'errors']);

        $this->assertGreaterThan(0, $response->json('success_count'));
    }

    public function test_import_reports_errors_for_missing_name(): void
    {
        $this->asAdmin();

        // 会社名が空の行
        $csv = "\xEF\xBB\xBF会社名,サービスティア\n"
            . ",A\n";

        $file = UploadedFile::fake()->createWithContent('customers.csv', $csv);

        $response = $this->postJson('/api/customers/import', ['file' => $file]);
        $response->assertStatus(200);

        $this->assertCount(1, $response->json('errors'));
    }

    public function test_import_requires_file(): void
    {
        $this->asAdmin();

        $this->postJson('/api/customers/import', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }
}
