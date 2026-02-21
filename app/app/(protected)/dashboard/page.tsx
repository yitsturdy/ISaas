'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  dashboardApi, DashboardStats, PerformanceData, NeglectedLead,
} from '@/lib/api';

// KPIカード
function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const CHART_COLORS = ['#3b82f6','#f59e0b','#f97316','#8b5cf6','#10b981','#6b7280','#ef4444'];

export default function DashboardPage() {
  const { token, user: me } = useAuth();

  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [perf, setPerf]         = useState<PerformanceData[]>([]);
  const [neglected, setNeglected] = useState<NeglectedLead[]>([]);
  const [loading, setLoading]   = useState(true);

  const canSeeAll = me?.role === 'Admin' || me?.role === 'Manager';

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.stats(token),
      dashboardApi.performance(token),
      dashboardApi.neglectedLeads(token),
    ]).then(([s, p, n]) => {
      setStats(s);
      setPerf(p);
      setNeglected(n);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">ようこそ、{me?.name} さん</p>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="総リード数"
            value={stats?.total_leads ?? 0}
            color="border-blue-500"
          />
          <KpiCard
            label="アクティブリード"
            value={stats?.active_leads ?? 0}
            sub="クローズ除く"
            color="border-green-500"
          />
          <KpiCard
            label="コンバージョン率"
            value={`${stats?.conversion_rate ?? 0}%`}
            sub={`成約 ${stats?.won_leads ?? 0} 件`}
            color="border-purple-500"
          />
          <KpiCard
            label="放置リード数"
            value={stats?.neglected_leads_count ?? 0}
            sub="閾値超過"
            color={neglected.length > 0 ? 'border-red-500' : 'border-gray-300'}
          />
        </div>

        {/* グラフ行 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* ステージ別リード数 */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">ステージ別リード数</h2>
            {stats?.leads_by_stage && stats.leads_by_stage.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.leads_by_stage} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="stage_name"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, 'リード数']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.leads_by_stage.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">データがありません</p>
            )}
          </div>

          {/* IS別達成率（Admin/Manager のみ） */}
          {canSeeAll && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">IS別パフォーマンス</h2>
              {perf.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={perf} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="user_name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      formatter={(v: number, name: string) => {
                        const labels: Record<string, string> = {
                          achievement_rate: '達成率',
                          active_leads_count: 'アクティブ',
                        };
                        return [name === 'achievement_rate' ? `${v}%` : v, labels[name] ?? name];
                      }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="achievement_rate" name="achievement_rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">ISメンバーがいません</p>
              )}
            </div>
          )}

          {/* ISロール自身のパフォーマンス */}
          {!canSeeAll && perf.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">自分のパフォーマンス</h2>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{perf[0].active_leads_count}</p>
                  <p className="text-xs text-gray-500 mt-1">アクティブ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{perf[0].won_leads_count}</p>
                  <p className="text-xs text-gray-500 mt-1">成約</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{perf[0].achievement_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1">達成率（月次）</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">
                月次目標: {perf[0].monthly_target_count} 件
              </p>
            </div>
          )}
        </div>

        {/* 放置リードアラート */}
        {neglected.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <h2 className="text-base font-semibold text-gray-800">放置リードアラート</h2>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{neglected.length} 件</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">リード名</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">担当者</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">ステージ</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">経過日数</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">閾値</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {neglected.map(lead => {
                    const over = (lead.days_since_last_activity ?? 0) - lead.threshold_days;
                    return (
                      <tr key={lead.lead_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{lead.title}</td>
                        <td className="px-4 py-2 text-gray-600">{lead.owner_name}</td>
                        <td className="px-4 py-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{lead.stage_name}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-xs font-bold ${over > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {lead.days_since_last_activity ?? '—'} 日
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-400">{lead.threshold_days} 日</td>
                        <td className="px-4 py-2">
                          <Link href={`/leads/${lead.lead_id}`}
                            className="text-blue-600 hover:underline text-xs">詳細</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {neglected.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 text-center text-gray-400 text-sm">
            放置リードはありません
          </div>
        )}
      </div>
    </div>
  );
}
