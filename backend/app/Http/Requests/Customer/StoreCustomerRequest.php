<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdminOrManager() ?? false;
    }

    public function rules(): array
    {
        return [
            'name'                 => ['required', 'string', 'max:255'],
            'company_id'           => ['nullable', 'string', 'max:100'],
            'domain'               => ['nullable', 'string', 'max:255'],
            'industry_category'    => ['nullable', 'string'],
            'employee_size'        => ['nullable', 'string'],
            'service_tier'         => ['required', 'in:A,B,C'],
            'website_url'          => ['nullable', 'url', 'max:500'],
            'is_existing_customer' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'        => '会社名は必須です。',
            'service_tier.required' => 'ターゲットランクは必須です。',
            'website_url.url'      => '有効なURLを入力してください。',
        ];
    }
}
