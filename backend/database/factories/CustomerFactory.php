<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'           => fake()->optional()->numerify('CID-####'),
            'name'                 => fake()->company(),
            'domain'               => fake()->domainName(),
            'industry_category'    => fake()->randomElement([
                'IT・テクノロジー', '製造業', '金融・保険', '小売・EC',
                '医療・ヘルスケア', '教育', '不動産', 'サービス業', '物流・運輸', 'その他',
            ]),
            'employee_size'        => fake()->randomElement([
                '1〜10人', '11〜50人', '51〜100人', '101〜300人', '301〜1000人', '1001人以上',
            ]),
            'service_tier'         => 'A',
            'website_url'          => fake()->url(),
            'is_existing_customer' => false,
        ];
    }

    public function existing(): static
    {
        return $this->state(fn (array $attributes) => ['is_existing_customer' => true]);
    }

    public function tierB(): static
    {
        return $this->state(fn (array $attributes) => ['service_tier' => 'B']);
    }

    public function tierC(): static
    {
        return $this->state(fn (array $attributes) => ['service_tier' => 'C']);
    }
}
