'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'ダッシュボード', roles: null },
  { href: '/leads',      label: 'リード管理',     roles: null },
  { href: '/customers',  label: '顧客管理',       roles: null },
  { href: '/users',      label: 'ユーザー管理',   roles: ['Admin', 'Manager'] as string[] },
];

const ROLE_LABEL: Record<string, string> = {
  Admin:   '管理者',
  Manager: 'マネージャー',
  IS:      'ISメンバー',
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* サイドバー */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-gray-900 text-white flex flex-col z-10">
        {/* ブランド */}
        <div className="px-5 py-5 border-b border-gray-700">
          <span className="text-lg font-bold tracking-wide text-white">ISaas</span>
          <p className="text-xs text-gray-400 mt-0.5">Inside Sales Platform</p>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item =>
            item.roles === null || (user?.role && item.roles.includes(user.role))
          ).map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ユーザー情報 + ログアウト */}
        <div className="px-4 py-4 border-t border-gray-700">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          )}
          <button onClick={logout}
            className="w-full text-left text-xs text-gray-400 hover:text-red-400 transition py-1">
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 ml-56">
        {children}
      </main>
    </div>
  );
}
