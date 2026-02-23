<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    // ---- helpers ----

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

    public function test_index_returns_paginated_users(): void
    {
        $this->asAdmin();
        User::factory()->count(3)->create();

        $this->getJson('/api/users')
            ->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
    }

    public function test_index_filters_by_role(): void
    {
        $this->asAdmin();
        User::factory()->admin()->count(2)->create();
        User::factory()->is()->count(3)->create();

        $response = $this->getJson('/api/users?role=Admin');
        $response->assertStatus(200);

        foreach ($response->json('data') as $u) {
            $this->assertEquals('Admin', $u['role']);
        }
    }

    public function test_index_filters_by_status(): void
    {
        $this->asAdmin();
        User::factory()->inactive()->count(2)->create();
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/users?status=inactive');
        $response->assertStatus(200);

        foreach ($response->json('data') as $u) {
            $this->assertEquals('inactive', $u['status']);
        }
    }

    public function test_index_searches_by_name_or_email(): void
    {
        $this->asAdmin();
        User::factory()->create(['name' => 'TargetName', 'email' => 'other@example.com']);
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/users?search=TargetName');
        $response->assertStatus(200);
        $this->assertGreaterThan(0, count($response->json('data')));
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/users')->assertStatus(401);
    }

    // ---- store ----

    public function test_store_creates_user(): void
    {
        $this->asAdmin();

        $this->postJson('/api/users', [
            'name'     => 'New User',
            'email'    => 'new@example.com',
            'password' => 'password123',
            'role'     => 'IS',
            'status'   => 'active',
        ])->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->asAdmin();

        $this->postJson('/api/users', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    // ---- show ----

    public function test_show_returns_user(): void
    {
        $this->asAdmin();
        $target = User::factory()->create();

        $this->getJson("/api/users/{$target->id}")
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $target->id]);
    }

    public function test_show_returns_404_for_nonexistent(): void
    {
        $this->asAdmin();

        $this->getJson('/api/users/99999')->assertStatus(404);
    }

    // ---- update ----

    public function test_update_modifies_user(): void
    {
        $admin  = $this->asAdmin();
        $target = User::factory()->create();

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Updated Name',
        ])->assertStatus(200)
            ->assertJsonFragment(['name' => 'Updated Name']);
    }

    public function test_admin_can_change_role(): void
    {
        $this->asAdmin();
        $target = User::factory()->is()->create();

        $this->putJson("/api/users/{$target->id}", [
            'role' => 'Manager',
        ])->assertStatus(200)
            ->assertJsonFragment(['role' => 'Manager']);
    }

    // ---- destroy ----

    public function test_admin_can_delete_user(): void
    {
        $this->asAdmin();
        $target = User::factory()->create();

        $this->deleteJson("/api/users/{$target->id}")->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_non_admin_cannot_delete_user(): void
    {
        $target = User::factory()->create();

        $this->asManager();
        $this->deleteJson("/api/users/{$target->id}")->assertStatus(403);

        $this->asIS();
        $this->deleteJson("/api/users/{$target->id}")->assertStatus(403);
    }
}
