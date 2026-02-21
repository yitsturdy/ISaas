'use client';

import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ダッシュボード</h1>
        <p className="text-gray-600">ようこそ、{user?.name} さん</p>
      </div>
    </div>
  );
}
