'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { leadStagesApi, LeadStage } from '@/lib/api';

type StageForm = {
  name: string;
  display_order: number;
  is_active: boolean;
  reassignment_threshold_days: number | null;
};

const emptyForm: StageForm = {
  name: '',
  display_order: 0,
  is_active: true,
  reassignment_threshold_days: null,
};

export default function LeadStagesSettingsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [stages, setStages]       = useState<LeadStage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<{ mode: 'create' | 'edit'; stage?: LeadStage } | null>(null);
  const [form, setForm]           = useState<StageForm>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [deleteId, setDeleteId]   = useState<number | null>(null);

  useEffect(() => {
    if (user && !['Admin', 'Manager'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (!token) return;
    leadStagesApi.list(token)
      .then(setStages)
      .finally(() => setLoading(false));
  }, [token]);

  function openCreate() {
    setForm(emptyForm);
    setError('');
    setModal({ mode: 'create' });
  }

  function openEdit(stage: LeadStage) {
    setForm({
      name: stage.name,
      display_order: stage.display_order,
      is_active: stage.is_active,
      reassignment_threshold_days: stage.reassignment_threshold_days,
    });
    setError('');
    setModal({ mode: 'edit', stage });
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (modal?.mode === 'create') {
        const newStage = await leadStagesApi.create(token, form);
        setStages(prev => [...prev, newStage].sort((a, b) => a.display_order - b.display_order));
      } else if (modal?.stage) {
        const updated = await leadStagesApi.update(token, modal.stage.id, form);
        setStages(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => a.display_order - b.display_order));
      }
      setModal(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await leadStagesApi.delete(token, id);
      setStages(prev => prev.filter(s => s.id !== id));
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? '削除に失敗しました。');
    } finally {
      setDeleteId(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">リードステージ設定</h1>
        <button onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          + ステージ追加
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">順序</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ステージ名</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">放置閾値（日）</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">状態</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stages.map(stage => (
              <tr key={stage.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{stage.display_order}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{stage.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {stage.reassignment_threshold_days != null ? `${stage.reassignment_threshold_days} 日` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stage.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {stage.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(stage)}
                    className="text-blue-600 hover:underline text-xs">編集</button>
                  <button onClick={() => setDeleteId(stage.id)}
                    className="text-red-500 hover:underline text-xs">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 作成・編集モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {modal.mode === 'create' ? 'ステージ追加' : 'ステージ編集'}
            </h2>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ステージ名 *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">表示順序</label>
                <input type="number" value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">放置閾値（日）</label>
                <input type="number" placeholder="未設定の場合は空欄"
                  value={form.reassignment_threshold_days ?? ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    reassignment_threshold_days: e.target.value === '' ? null : Number(e.target.value),
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">有効</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">ステージを削除しますか？</h2>
            <p className="text-sm text-gray-500 mb-6">このステージを使用中のリードがある場合は削除できません。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
