'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { leadsApi, leadStagesApi, Lead, LeadStage, LeadParams } from '@/lib/api';

const STAGE_COLORS = [
  'border-gray-300 bg-gray-50',
  'border-blue-300 bg-blue-50',
  'border-yellow-300 bg-yellow-50',
  'border-orange-300 bg-orange-50',
  'border-purple-300 bg-purple-50',
  'border-green-300 bg-green-50',
  'border-red-300 bg-red-50',
];

export default function LeadsPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [leads, setLeads]   = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);

  const [search,  setSearch]  = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const canWrite = me?.role === 'Admin' || me?.role === 'Manager';

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        leadStagesApi.list(token),
        leadsApi.list(token, {
          search: search || undefined,
          owner_id: ownerId ? Number(ownerId) : undefined,
          per_page: 200,
        } as LeadParams),
      ]);
      setStages(stagesRes.filter(s => s.is_active));
      setLeads(leadsRes.data);
      setTotal(leadsRes.total);
    } finally {
      setLoading(false);
    }
  }, [token, search, ownerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number) => {
    if (!token || !confirm('このリードを削除しますか？')) return;
    await leadsApi.delete(token, id);
    fetchAll();
  };

  const leadsByStage = (stageId: number | null) =>
    leads.filter(l => l.current_stage_id === stageId);

  const unassignedLeads = leads.filter(l => l.current_stage_id === null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">リード管理</h1>
            <p className="text-sm text-gray-500 mt-1">全 {total} 件</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                カンバン
              </button>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                リスト
              </button>
            </div>
            {canWrite && (
              <Link href="/leads/new"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + リード追加
              </Link>
            )}
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" placeholder="タイトル・会社名で検索" value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="担当者ID" value={ownerId}
            onChange={e => setOwnerId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>
        ) : viewMode === 'kanban' ? (
          /* カンバンビュー */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage, idx) => {
              const stageLeads = leadsByStage(stage.id);
              const color = STAGE_COLORS[idx % STAGE_COLORS.length];
              return (
                <div key={stage.id} className={`flex-shrink-0 w-72 rounded-xl border-2 ${color} flex flex-col`}>
                  <div className="p-3 border-b border-inherit">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-700">{stage.name}</span>
                      <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 border border-gray-200">{stageLeads.length}</span>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                    {stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} canWrite={canWrite}
                        isAdmin={me?.role === 'Admin'}
                        onDetail={() => router.push(`/leads/${lead.id}`)}
                        onEdit={() => router.push(`/leads/${lead.id}/edit`)}
                        onDelete={() => handleDelete(lead.id)} />
                    ))}
                    {stageLeads.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">リードなし</p>
                    )}
                  </div>
                </div>
              );
            })}
            {unassignedLeads.length > 0 && (
              <div className="flex-shrink-0 w-72 rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-500">未割り当て</span>
                    <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-500">{unassignedLeads.length}</span>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {unassignedLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} canWrite={canWrite}
                      isAdmin={me?.role === 'Admin'}
                      onDetail={() => router.push(`/leads/${lead.id}`)}
                      onEdit={() => router.push(`/leads/${lead.id}/edit`)}
                      onDelete={() => handleDelete(lead.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* リストビュー */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">タイトル</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">顧客</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">ステージ</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">担当者</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">最終活動</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">リードが見つかりません</td></tr>
                ) : leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{lead.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {lead.current_stage ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{lead.current_stage.name}</span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{lead.owner?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString('ja-JP') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => router.push(`/leads/${lead.id}`)}
                          className="text-blue-600 hover:underline text-xs">詳細</button>
                        {canWrite && (
                          <button onClick={() => router.push(`/leads/${lead.id}/edit`)}
                            className="text-gray-600 hover:underline text-xs">編集</button>
                        )}
                        {me?.role === 'Admin' && (
                          <button onClick={() => handleDelete(lead.id)}
                            className="text-red-500 hover:underline text-xs">削除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type LeadCardProps = {
  lead: Lead;
  canWrite: boolean;
  isAdmin: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function LeadCard({ lead, canWrite, isAdmin, onDetail, onEdit, onDelete }: LeadCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition cursor-pointer"
      onClick={onDetail}>
      <div className="font-medium text-sm text-gray-800 mb-1 line-clamp-2">{lead.title}</div>
      <div className="text-xs text-gray-500 mb-2">{lead.customer?.name}</div>
      {lead.owner && (
        <div className="text-xs text-gray-400">担当: {lead.owner.name}</div>
      )}
      {lead.last_activity_at && (
        <div className="text-xs text-gray-400 mt-1">
          {new Date(lead.last_activity_at).toLocaleDateString('ja-JP')}
        </div>
      )}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
        {canWrite && (
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-gray-700">編集</button>
        )}
        {isAdmin && (
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">削除</button>
        )}
      </div>
    </div>
  );
}
