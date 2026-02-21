'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';

export default function NewUserPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
    role: 'IS' as const, status: 'onboarding' as const,
    join_at: '', monthly_target_count: 0, extension_number: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  if (me?.role !== 'Admin') {
    router.push('/users');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErrors({});
    try {
      const created = await usersApi.create(token, form);
      router.push(`/users/${created.id}`);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { name: [e.message ?? '作成に失敗しました。'] });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/users" className="hover:text-blue-600">ユーザー管理</Link>
          <span>/</span>
          <span className="text-gray-800">新規追加</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">ユーザー追加</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: '氏名 *', key: 'name', type: 'text', required: true },
              { label: 'ユーザー名', key: 'username', type: 'text', required: false },
              { label: 'メールアドレス *', key: 'email', type: 'email', required: true },
              { label: 'パスワード *', key: 'password', type: 'password', required: true },
              { label: '稼働開始日', key: 'join_at', type: 'date', required: false },
              { label: '内線番号', key: 'extension_number', type: 'text', required: false },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} required={required} value={String(form[key as keyof typeof form])} onChange={set(key as keyof typeof form)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月次目標数</label>
              <input type="number" min={0} value={form.monthly_target_count}
                onChange={e => setForm(p => ({ ...p, monthly_target_count: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">権限 *</label>
              <select value={form.role} onChange={set('role')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Admin">管理者</option>
                <option value="Manager">マネージャー</option>
                <option value="IS">IS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス *</label>
              <select value={form.status} onChange={set('status')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">稼働中</option>
                <option value="onboarding">オンボーディング</option>
                <option value="inactive">非稼働</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '作成中...' : '追加する'}
              </button>
              <button type="button" onClick={() => router.push('/users')}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}