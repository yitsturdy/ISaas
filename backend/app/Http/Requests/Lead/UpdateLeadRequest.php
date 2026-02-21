<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminOrManager();
    }

    public function rules(): array
    {
        return [
            'customer_id'      => ['sometimes', 'integer', 'exists:customers,id'],
            'owner_id'         => ['nullable', 'integer', 'exists:users,id'],
            'current_stage_id' => ['nullable', 'integer', 'exists:lead_stages,id'],
            'title'            => ['sometimes', 'required', 'string', 'max:255'],
            'note'             => ['nullable', 'string'],
        ];
    }
}
