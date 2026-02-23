<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LeadStage>
 */
class LeadStageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'                        => fake()->words(2, true),
            'display_order'               => fake()->numberBetween(0, 10),
            'is_active'                   => true,
            'reassignment_threshold_days' => null,
        ];
    }

    public function withThreshold(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'reassignment_threshold_days' => $days,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => ['name' => 'クローズ（成約）']);
    }

    public function lost(): static
    {
        return $this->state(fn (array $attributes) => ['name' => 'クローズ（失注）']);
    }
}
