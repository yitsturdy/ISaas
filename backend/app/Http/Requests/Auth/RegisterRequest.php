<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'      => '氏名は必須です。',
            'email.required'     => 'メールアドレスは必須です。',
            'email.email'        => '有効なメールアドレスを入力してください。',
            'email.unique'       => 'このメールアドレスは既に使用されています。',
            'password.required'  => 'パスワードは必須です。',
            'password.min'       => 'パスワードは8文字以上で入力してください。',
            'password.confirmed' => 'パスワードが一致しません。',
        ];
    }
}
