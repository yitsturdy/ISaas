'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi, User, Role, Status, UserParams } from '@/lib/api';

const ROLE_LABEL: Record<Role, string>     = { Admin: '管理者', Manager: 'マネージャー', IS: 'IS' };
const STATUS_LABEL: Record<Status, string> = { active: '稼働中', onboarding: 'オンボーディング', inactive: '非稼働' };
const STATUS_COLOR: Record<Status, string> = {
  active: 'bg-green-100 text-green-700',
  onboarding: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
};

export default function UsersPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [users, setUsers]       = useState<User[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading]   = useState(false);

  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState<Role | ''>('');
  const [status,  setStatus]  = useState<Status | ''>('');
  const [sortBy,  setSortBy]  = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: UserParams = { page, per_page: 15, sort_by: sortBy, sort_dir: sortDir };
      if (search) params.search = search;
      if (role)   params.role   = role;
      if (status) params.status = status;
      const res = await usersApi.list(token, params);
      setUsers(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, role, status, sortBy, sortDir]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('このユーザーを削除しますか？')) return;
    await usersApi.delete(token, id);
    fetchUsers();
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortBy === col ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ユーザー管理</h1>
            <p className="text-sm text-gray-500 mt-1">全 {total} 件</p>
          </div>
          {me?.role === 'Admin' && (
            <Link href="/users/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + ユーザー追加
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="名前・メール・ユーザー名で検索"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={role} onChange={e => { setRole(e.target.value as Role | ''); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべての権限</option>
            {(Object.entries(ROLE_LABEL) as [Role, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value as Status | ''); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">すべてのステータス</option>
            {(Object.entries(STATUS_LABEL) as [Status, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[['name','氏名'],['email','メールアドレス'],['role','権限'],['status','ステータス'],['join_at','稼働開始日']].map(([col, label]) => (
                  <th key={col} onClick={() => handleSort(col)}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none">
                    {label}<SortIcon col={col} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">ユーザーが見つかりません</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{u.name}</div>
                    {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLOR[u.status]}`}>
                      {STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.join_at ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/users/${u.id}`)}
                        className="text-blue-600 hover:underline text-xs">詳細</button>
                      {(me?.role === 'Admin' || me?.role === 'Manager' || me?.id === u.id) && (
                        <button onClick={() => router.push(`/users/${u.id}/edit`)}
                          className="text-gray-600 hover:underline text-xs">編集</button>
                      )}
                      {me?.role === 'Admin' && me.id !== u.id && (
                        <button onClick={() => handleDelete(u.id)}
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
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
              前へ
            </button>
            <span className="text-sm text-gray-600">{page} / {lastPage}</span>
            <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}