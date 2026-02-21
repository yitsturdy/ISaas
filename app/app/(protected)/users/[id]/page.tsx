'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usersApi, User } from '@/lib/api';

const ROLE_LABEL   = { Admin: '管理者', Manager: 'マネージャー', IS: 'IS' } as const;
const STATUS_LABEL = { active: '稼働中', onboarding: 'オンボーディング', inactive: '非稼働' } as const;
const STATUS_COLOR = {
  active: 'bg-green-100 text-green-700',
  onboarding: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
} as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-3 border-b border-gray-100 last:border-0">
      <dt className="w-40 text-sm font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { token, user: me } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    usersApi.get(token, Number(id))
      .then(setUser)
      .catch(() => router.push('/users'))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;
  if (!user)   return null;

  const canEdit = me?.role === 'Admin' || me?.role === 'Manager' || me?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/users" className="hover:text-blue-600">ユーザー管理</Link>
          <span>/</span>
          <span className="text-gray-800">{user.name}</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
              {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLOR[user.status]}`}>
              {STATUS_LABEL[user.status]}
            </span>
          </div>

          <dl>
            <Row label="メールアドレス" value={user.email} />
            <Row label="権限" value={ROLE_LABEL[user.role]} />
            <Row label="稼働開始日" value={user.join_at} />
            <Row label="月次目標" value={user.monthly_target_count ? `${user.monthly_target_count} 件` : null} />
            <Row label="内線番号" value={user.extension_number} />
          </dl>

          {canEdit && (
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push(`/users/${user.id}/edit`)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                編集
              </button>
              <button onClick={() => router.back()}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition">
                戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}