'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName]                         = useState('');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [passwordConfirmation, setPasswordConf] = useState('');
  const [errors, setErrors]                     = useState<Record<string, string[]>>({});
  const [loading, setLoading]                   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register(name, email, password, passwordConfirmation);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { name: [e.message ?? '登録に失敗しました。'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">新規登録</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: '氏名', type: 'text',     value: name,                 setter: setName,        key: 'name' },
            { label: 'メールアドレス', type: 'email', value: email,          setter: setEmail,       key: 'email' },
            { label: 'パスワード', type: 'password', value: password,       setter: setPassword,    key: 'password' },
            { label: 'パスワード（確認）', type: 'password', value: passwordConfirmation, setter: setPasswordConf, key: 'password_confirmation' },
          ].map(({ label, type, value, setter, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? '登録中...' : '登録する'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          既にアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-blue-600 hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
