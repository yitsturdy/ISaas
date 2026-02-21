'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usersApi, User } from '@/lib/api';

export default function EditUserPage() {
  const { token, user: me } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm]     = useState<Partial<User> & { password?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!token) return;
    usersApi.get(token, Number(id))
      .then(u => setForm({
        name: u.name, username: u.username ?? '', email: u.email,
        role: u.role, status: u.status,
        join_at: u.join_at ?? '', monthly_target_count: u.monthly_target_count,
        extension_number: u.extension_number ?? '',
      }))
      .catch(() => router.push('/users'))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErrors({});
    try {
      await usersApi.update(token, Number(id), form);
      router.push(`/users/${id}`);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { name: [e.message ?? '更新に失敗しました。'] });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/users" className="hover:text-blue-600">ユーザー管理</Link>
          <span>/</span>
          <Link href={`/users/${id}`} className="hover:text-blue-600">{form.name}</Link>
          <span>/</span>
          <span className="text-gray-800">編集</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">ユーザー編集</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: '氏名 *', key: 'name', type: 'text' },
              { label: 'ユーザー名', key: 'username', type: 'text' },
              { label: 'メールアドレス *', key: 'email', type: 'email' },
              { label: '稼働開始日', key: 'join_at', type: 'date' },
              { label: '内線番号', key: 'extension_number', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={String(form[key as keyof typeof form] ?? '')} onChange={set(key as keyof typeof form)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月次目標数</label>
              <input type="number" min={0} value={form.monthly_target_count ?? 0}
                onChange={e => setForm(p => ({ ...p, monthly_target_count: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {me?.role === 'Admin' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">権限</label>
                  <select value={form.role ?? 'IS'} onChange={set('role')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Admin">管理者</option>
                    <option value="Manager">マネージャー</option>
                    <option value="IS">IS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select value={form.status ?? 'onboarding'} onChange={set('status')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="active">稼働中</option>
                    <option value="onboarding">オンボーディング</option>
                    <option value="inactive">非稼働</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（変更する場合のみ）</label>
              <input type="password" value={form.password ?? ''} onChange={set('password')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '更新中...' : '更新する'}
              </button>
              <button type="button" onClick={() => router.back()}
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