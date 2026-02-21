<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class TransitionLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to_stage_id'  => ['required', 'integer', 'exists:lead_stages,id'],
            'reason_code'  => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_stage_id.required' => '遷移先ステージは必須です。',
            'to_stage_id.exists'   => '指定されたステージが存在しません。',
        ];
    }
}
