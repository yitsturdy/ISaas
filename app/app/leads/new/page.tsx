'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { leadsApi, leadStagesApi, customersApi, usersApi, LeadStage, Customer, User } from '@/lib/api';

export default function NewLeadPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    customer_id: '',
    owner_id: '',
    current_stage_id: '',
    note: '',
  });
  const [stages, setStages]       = useState<LeadStage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [errors, setErrors]       = useState<Record<string, string[]>>({});
  const [saving, setSaving]       = useState(false);

  if (me?.role !== 'Admin' && me?.role !== 'Manager') {
    router.push('/leads');
    return null;
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([
      leadStagesApi.list(token),
      customersApi.list(token, { per_page: 200 }),
      usersApi.list(token, { per_page: 200 }),
    ]).then(([s, c, u]) => {
      setStages(s.filter(st => st.is_active));
      setCustomers(c.data);
      setUsers(u.data);
    });
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErrors({});
    try {
      const created = await leadsApi.create(token, {
        title:            form.title,
        customer_id:      Number(form.customer_id),
        owner_id:         form.owner_id ? Number(form.owner_id) : null,
        current_stage_id: form.current_stage_id ? Number(form.current_stage_id) : null,
        note:             form.note || null,
      });
      router.push(`/leads/${created.id}`);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { title: [e.message ?? '作成に失敗しました。'] });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/leads" className="hover:text-blue-600">リード管理</Link>
          <span>/</span>
          <span className="text-gray-800">新規追加</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">リード追加</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
              <input type="text" required value={form.title} onChange={set('title')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">顧客 *</label>
              <select required value={form.customer_id} onChange={set('customer_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {customers.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
              <select value={form.owner_id} onChange={set('owner_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">未割り当て</option>
                {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">初期ステージ</label>
              <select value={form.current_stage_id} onChange={set('current_stage_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {stages.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
              <textarea value={form.note} onChange={set('note')} rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '作成中...' : '追加する'}
              </button>
              <button type="button" onClick={() => router.push('/leads')}
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
