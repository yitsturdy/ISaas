<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:255'],
            'username'              => ['nullable', 'string', 'max:255', 'unique:users'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'              => ['required', 'string', 'min:8'],
            'role'                  => ['required', 'in:Admin,Manager,IS'],
            'status'                => ['required', 'in:active,onboarding,inactive'],
            'join_at'               => ['nullable', 'date'],
            'monthly_target_count'  => ['nullable', 'integer', 'min:0'],
            'extension_number'      => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => '氏名は必須です。',
            'email.required'    => 'メールアドレスは必須です。',
            'email.unique'      => 'このメールアドレスは既に使用されています。',
            'password.required' => 'パスワードは必須です。',
            'password.min'      => 'パスワードは8文字以上で入力してください。',
            'role.required'     => '権限は必須です。',
            'role.in'           => '権限の値が不正です。',
            'status.required'   => 'ステータスは必須です。',
            'status.in'         => 'ステータスの値が不正です。',
        ];
    }
}
