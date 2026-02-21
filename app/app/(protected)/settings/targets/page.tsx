'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi, User } from '@/lib/api';

export default function TargetsSettingsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState<number | null>(null);

  useEffect(() => {
    if (user && !['Admin', 'Manager'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (!token) return;
    usersApi.list(token, { per_page: 100 })
      .then(res => setUsers(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditValue(String(u.monthly_target_count ?? 0));
  }

  async function handleSave(u: User) {
    if (!token) return;
    const value = Number(editValue);
    if (isNaN(value) || value < 0) return;
    setSaving(true);
    try {
      const updated = await usersApi.update(token, u.id, { monthly_target_count: value });
      setUsers(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingId(null);
      setSaved(u.id);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    Admin: '管理者', Manager: 'マネージャー', IS: 'ISメンバー',
  };

  if (loading) return <div className="p-8 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">月次目標値設定</h1>
      <p className="text-sm text-gray-500 mb-6">各ユーザーの月間成約目標件数を設定します。</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">名前</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ロール</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">月次目標（件）</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  {editingId === u.id ? (
                    <input type="number" min="0" value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(u); if (e.key === 'Escape') setEditingId(null); }}
                      className="w-24 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus />
                  ) : (
                    <span className={`font-medium ${saved === u.id ? 'text-green-600' : 'text-gray-800'}`}>
                      {u.monthly_target_count ?? 0} 件
                      {saved === u.id && <span className="text-green-600 text-xs ml-2">保存しました</span>}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === u.id ? (
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleSave(u)} disabled={saving}
                        className="text-blue-600 hover:underline text-xs disabled:opacity-50">
                        {saving ? '...' : '保存'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:underline text-xs">
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(u)}
                      className="text-blue-600 hover:underline text-xs">
                      編集
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
