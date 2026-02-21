'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { customersApi, Customer } from '@/lib/api';

const TIER_COLOR = { A: 'bg-red-100 text-red-700', B: 'bg-orange-100 text-orange-700', C: 'bg-blue-100 text-blue-700' } as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-3 border-b border-gray-100 last:border-0">
      <dt className="w-44 text-sm font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { token, user: me } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!token) return;
    customersApi.get(token, Number(id))
      .then(setCustomer)
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;
  if (!customer) return null;

  const canWrite = me?.role === 'Admin' || me?.role === 'Manager';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/customers" className="hover:text-blue-600">顧客管理</Link>
          <span>/</span>
          <span className="text-gray-800">{customer.name}</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{customer.name}</h1>
              {customer.domain && <p className="text-sm text-gray-400 mt-0.5">{customer.domain}</p>}
            </div>
            <div className="flex gap-2 items-center">
              <span className={`text-sm font-bold px-2.5 py-1 rounded ${TIER_COLOR[customer.service_tier]}`}>
                {customer.service_tier}ランク
              </span>
              <span className={`text-xs px-2 py-1 rounded ${customer.is_existing_customer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {customer.is_existing_customer ? '既存顧客' : '新規顧客'}
              </span>
            </div>
          </div>

          <dl>
            <Row label="業界カテゴリ"   value={customer.industry_category} />
            <Row label="従業員規模"     value={customer.employee_size} />
            <Row label="Webサイト"      value={customer.website_url
              ? <a href={customer.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{customer.website_url}</a>
              : null} />
            <Row label="クライアントID" value={customer.company_id} />
          </dl>

          {canWrite && (
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push(`/customers/${customer.id}/edit`)}
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
