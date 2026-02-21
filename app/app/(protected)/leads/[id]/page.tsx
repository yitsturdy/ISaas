'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { leadsApi, leadStagesApi, Lead, LeadStage } from '@/lib/api';

function Timeline({ lead }: { lead: Lead }) {
  const histories = lead.stage_histories ?? [];
  if (histories.length === 0) {
    return <p className="text-sm text-gray-400">ステージ変更履歴はありません。</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {[...histories].reverse().map(h => (
        <li key={h.id} className="mb-6 ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-8 ring-white">
            <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          </span>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              {h.from_stage ? (
                <>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{h.from_stage.name}</span>
                  <span className="text-gray-400 text-xs">→</span>
                </>
              ) : null}
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{h.to_stage.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {h.changed_by_user && <span>変更者: {h.changed_by_user.name}</span>}
              {h.reason_code && <span>理由: {h.reason_code}</span>}
              {h.stay_days != null && <span>在留: {h.stay_days}日</span>}
              <span>{new Date(h.created_at).toLocaleString('ja-JP')}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function LeadDetailPage() {
  const { token, user: me } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead]     = useState<Lead | null>(null);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');

  const canWrite = me?.role === 'Admin' || me?.role === 'Manager';

  useEffect(() => {
    if (!token) return;
    Promise.all([
      leadsApi.get(token, Number(id)),
      leadStagesApi.list(token),
    ])
      .then(([l, s]) => {
        setLead(l);
        setStages(s.filter(st => st.is_active));
        setSelectedStage(String(l.current_stage_id ?? ''));
      })
      .catch(() => router.push('/leads'))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const handleTransition = async () => {
    if (!token || !lead || !selectedStage) return;
    setTransitioning(true);
    try {
      const updated = await leadsApi.transition(token, lead.id, { to_stage_id: Number(selectedStage) });
      setLead(updated);
      setSelectedStage(String(updated.current_stage_id ?? ''));
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;
  if (!lead)   return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        {/* パンくず */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/leads" className="hover:text-blue-600">リード管理</Link>
          <span>/</span>
          <span className="text-gray-800">{lead.title}</span>
        </div>

        <div className="grid gap-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{lead.title}</h1>
                <Link href={`/customers/${lead.customer_id}`} className="text-sm text-blue-600 hover:underline mt-0.5 block">
                  {lead.customer?.name}
                </Link>
              </div>
              {canWrite && (
                <button onClick={() => router.push(`/leads/${lead.id}/edit`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                  編集
                </button>
              )}
            </div>

            <dl className="divide-y divide-gray-100">
              <div className="flex py-3">
                <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">現在のステージ</dt>
                <dd className="text-sm">
                  {lead.current_stage ? (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">{lead.current_stage.name}</span>
                  ) : <span className="text-gray-400">未設定</span>}
                </dd>
              </div>
              <div className="flex py-3">
                <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">担当者</dt>
                <dd className="text-sm text-gray-800">{lead.owner?.name ?? '—'}</dd>
              </div>
              <div className="flex py-3">
                <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">最終活動日</dt>
                <dd className="text-sm text-gray-800">
                  {lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleString('ja-JP') : '—'}
                </dd>
              </div>
              <div className="flex py-3">
                <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">タッチ数</dt>
                <dd className="text-sm text-gray-800">{lead.total_touch_count}</dd>
              </div>
              {lead.note && (
                <div className="flex py-3">
                  <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">メモ</dt>
                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{lead.note}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ステージ遷移 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">ステージ変更</h2>
            <div className="flex gap-3 items-center">
              <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ステージを選択</option>
                {stages.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={handleTransition}
                disabled={!selectedStage || String(lead.current_stage_id) === selectedStage || transitioning}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                {transitioning ? '変更中...' : '変更する'}
              </button>
            </div>
          </div>

          {/* 履歴タイムライン */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">ステージ変更履歴</h2>
            <Timeline lead={lead} />
          </div>
        </div>
      </div>
    </div>
  );
}
