<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminOrManager();
    }

    public function rules(): array
    {
        return [
            'customer_id'      => ['required', 'integer', 'exists:customers,id'],
            'owner_id'         => ['nullable', 'integer', 'exists:users,id'],
            'current_stage_id' => ['nullable', 'integer', 'exists:lead_stages,id'],
            'title'            => ['required', 'string', 'max:255'],
            'note'             => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => '顧客は必須です。',
            'customer_id.exists'   => '顧客が存在しません。',
            'title.required'       => 'タイトルは必須です。',
            'title.max'            => 'タイトルは255文字以内で入力してください。',
        ];
    }
}
