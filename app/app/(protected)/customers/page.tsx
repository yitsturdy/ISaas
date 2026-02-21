'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { customersApi, Customer, ServiceTier, IndustryCategory, CustomerParams, ImportResult } from '@/lib/api';

const TIER_COLOR: Record<ServiceTier, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-orange-100 text-orange-700',
  C: 'bg-blue-100 text-blue-700',
};

const INDUSTRIES: IndustryCategory[] = [
  'IT・テクノロジー', '製造業', '金融・保険', '小売・EC',
  '医療・ヘルスケア', '教育', '不動産', 'サービス業', '物流・運輸', 'その他',
];

export default function CustomersPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);
  const [loading, setLoading]     = useState(false);

  const [search,   setSearch]   = useState('');
  const [industry, setIndustry] = useState<IndustryCategory | ''>('');
  const [tier,     setTier]     = useState<ServiceTier | ''>('');
  const [existing, setExisting] = useState<'' | 'true' | 'false'>('');
  const [sortBy,   setSortBy]   = useState('created_at');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');

  const [importOpen,   setImportOpen]   = useState(false);
  const [importFile,   setImportFile]   = useState<File | null>(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: CustomerParams = { page, per_page: 15, sort_by: sortBy, sort_dir: sortDir };
      if (search)   params.search   = search;
      if (industry) params.industry_category = industry;
      if (tier)     params.service_tier      = tier;
      if (existing !== '') params.is_existing_customer = existing === 'true';
      const res = await customersApi.list(token, params);
      setCustomers(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, industry, tier, existing, sortBy, sortDir]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('この顧客を削除しますか？')) return;
    await customersApi.delete(token, id);
    fetchCustomers();
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy === col ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  const canWrite = me?.role === 'Admin' || me?.role === 'Manager';

  async function handleExport() {
    if (!token) return;
    const params: CustomerParams = {};
    if (search)   params.search             = search;
    if (industry) params.industry_category  = industry;
    if (tier)     params.service_tier       = tier;
    if (existing !== '') params.is_existing_customer = existing === 'true';
    await customersApi.export(token, params);
  }

  async function handleImport() {
    if (!token || !importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await customersApi.import(token, importFile);
      setImportResult(result);
      if (result.success_count > 0) fetchCustomers();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? 'インポートに失敗しました。');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">顧客管理</h1>
            <p className="text-sm text-gray-500 mt-1">全 {total} 件</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition">
              CSV出力
            </button>
            <button onClick={() => { setImportResult(null); setImportFile(null); setImportOpen(true); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition">
              CSVインポート
            </button>
            {canWrite && (
              <Link href="/customers/new"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + 顧客追加
              </Link>
            )}
          </div>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" placeholder="会社名・ドメインで検索" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={industry} onChange={e => { setIndustry(e.target.value as IndustryCategory | ''); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべての業界</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={tier} onChange={e => { setTier(e.target.value as ServiceTier | ''); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべてのランク</option>
            <option value="A">Aランク</option>
            <option value="B">Bランク</option>
            <option value="C">Cランク</option>
          </select>
          <select value={existing} onChange={e => { setExisting(e.target.value as '' | 'true' | 'false'); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">新規・既存すべて</option>
            <option value="true">既存顧客</option>
            <option value="false">新規顧客</option>
          </select>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[['name','会社名'],['industry_category','業界'],['employee_size','規模'],['service_tier','ランク']].map(([col, label]) => (
                  <th key={col} onClick={() => handleSort(col)}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none">
                    {label}<SortIcon col={col} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-gray-600">種別</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">顧客が見つかりません</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{c.name}</div>
                    {c.domain && <div className="text-xs text-gray-400">{c.domain}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.industry_category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.employee_size ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${TIER_COLOR[c.service_tier]}`}>
                      {c.service_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.is_existing_customer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.is_existing_customer ? '既存' : '新規'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/customers/${c.id}`)}
                        className="text-blue-600 hover:underline text-xs">詳細</button>
                      {canWrite && (
                        <button onClick={() => router.push(`/customers/${c.id}/edit`)}
                          className="text-gray-600 hover:underline text-xs">編集</button>
                      )}
                      {me?.role === 'Admin' && (
                        <button onClick={() => handleDelete(c.id)}
                          className="text-red-500 hover:underline text-xs">削除</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">前へ</button>
            <span className="text-sm text-gray-600">{page} / {lastPage}</span>
            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">次へ</button>
          </div>
        )}
      </div>

      {/* CSVインポートモーダル */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">CSVインポート（顧客）</h2>
            <p className="text-xs text-gray-500 mb-4">
              ヘッダー行: 会社名, ドメイン, 業種, 従業員数, サービスティア, ウェブサイト, 既存顧客(既存/新規)
            </p>

            <input type="file" accept=".csv,.txt"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 mb-4" />

            {importResult && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 border text-sm">
                <p className="font-medium text-green-700 mb-1">✓ {importResult.success_count} 件インポート完了</p>
                {importResult.errors.length > 0 && (
                  <ul className="text-red-600 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e.row}行目: {e.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setImportOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                閉じる
              </button>
              <button onClick={handleImport} disabled={!importFile || importing}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {importing ? 'インポート中...' : 'インポート'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
