<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdminOrManager() ?? false;
    }

    public function rules(): array
    {
        return [
            'name'                 => ['sometimes', 'string', 'max:255'],
            'company_id'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'domain'               => ['sometimes', 'nullable', 'string', 'max:255'],
            'industry_category'    => ['sometimes', 'nullable', 'string'],
            'employee_size'        => ['sometimes', 'nullable', 'string'],
            'service_tier'         => ['sometimes', 'in:A,B,C'],
            'website_url'          => ['sometimes', 'nullable', 'url', 'max:500'],
            'is_existing_customer' => ['sometimes', 'boolean'],
        ];
    }
}
