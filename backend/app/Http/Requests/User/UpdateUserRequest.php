<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Admin は全員、Manager・IS は自分のみ編集可
        $target = $this->route('user');
        $auth   = $this->user();

        return $auth?->isAdmin()
            || $auth?->isManager()
            || $auth?->id === $target?->id;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name'                  => ['sometimes', 'string', 'max:255'],
            'username'              => ['sometimes', 'nullable', 'string', 'max:255', "unique:users,username,{$userId}"],
            'email'                 => ['sometimes', 'string', 'email', 'max:255', "unique:users,email,{$userId}"],
            'password'              => ['sometimes', 'string', 'min:8'],
            'role'                  => ['sometimes', 'in:Admin,Manager,IS'],
            'status'                => ['sometimes', 'in:active,onboarding,inactive'],
            'join_at'               => ['sometimes', 'nullable', 'date'],
            'monthly_target_count'  => ['sometimes', 'nullable', 'integer', 'min:0'],
            'extension_number'      => ['sometimes', 'nullable', 'string', 'max:20'],
        ];
    }
}
