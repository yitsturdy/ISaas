<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\LeadStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Lead>
 */
class LeadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'customer_id'       => Customer::factory(),
            'owner_id'          => User::factory(),
            'current_stage_id'  => null,
            'title'             => fake()->sentence(4),
            'note'              => fake()->optional()->paragraph(),
            'last_activity_at'  => now(),
            'stage_updated_at'  => null,
            'total_touch_count' => 0,
        ];
    }

    public function withStage(LeadStage $stage): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stage_id' => $stage->id,
            'stage_updated_at' => now(),
        ]);
    }

    public function neglected(int $days = 14): static
    {
        return $this->state(fn (array $attributes) => [
            'last_activity_at' => now()->subDays($days),
        ]);
    }

    public function unassigned(): static
    {
        return $this->state(fn (array $attributes) => ['owner_id' => null]);
    }
}
