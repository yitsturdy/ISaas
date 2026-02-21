<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'domain',
        'industry_category',
        'employee_size',
        'service_tier',
        'website_url',
        'is_existing_customer',
    ];

    protected function casts(): array
    {
        return [
            'is_existing_customer' => 'boolean',
        ];
    }
}
