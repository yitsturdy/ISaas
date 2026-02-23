<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name'                 => fake()->name(),
            'email'                => fake()->unique()->safeEmail(),
            'email_verified_at'    => now(),
            'password'             => static::$password ??= Hash::make('password'),
            'remember_token'       => Str::random(10),
            'role'                 => 'IS',
            'status'               => 'active',
            'monthly_target_count' => 0,
            'username'             => null,
            'join_at'              => null,
            'extension_number'     => null,
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'Admin']);
    }

    public function manager(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'Manager']);
    }

    public function is(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'IS']);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'inactive']);
    }

    public function onboarding(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'onboarding']);
    }
}
