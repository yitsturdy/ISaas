<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ---- register ----

    public function test_register_creates_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'Test User',
            'email'                 => 'test@example.com',
            'password'              => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user', 'access_token', 'token_type']);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_register_requires_name_email_password(): void
    {
        $this->postJson('/api/register', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_register_validates_email_format(): void
    {
        $this->postJson('/api/register', [
            'name'                  => 'Test',
            'email'                 => 'not-an-email',
            'password'              => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_requires_password_confirmation(): void
    {
        $this->postJson('/api/register', [
            'name'                  => 'Test',
            'email'                 => 'test@example.com',
            'password'              => 'password',
            'password_confirmation' => 'wrong',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/register', [
            'name'                  => 'Test',
            'email'                 => 'dup@example.com',
            'password'              => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ---- login ----

    public function test_login_with_valid_credentials_returns_token(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret')]);

        $this->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'secret',
        ])->assertStatus(200)
            ->assertJsonStructure(['user', 'access_token', 'token_type']);
    }

    public function test_login_with_wrong_password_returns_422(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct')]);

        $this->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'wrong',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ---- logout ----

    public function test_logout_deletes_current_token(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertStatus(200);

        $this->assertDatabaseEmpty('personal_access_tokens');
    }

    // ---- guestLogin ----

    public function test_guest_login_returns_token_when_guest_exists(): void
    {
        User::factory()->create(['email' => 'guest@example.com']);

        $this->postJson('/api/guest-login')
            ->assertStatus(200)
            ->assertJsonStructure(['access_token']);
    }

    public function test_guest_login_returns_404_when_guest_not_exists(): void
    {
        $this->postJson('/api/guest-login')
            ->assertStatus(404);
    }

    // ---- me ----

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/user')->assertStatus(401);
    }
}
