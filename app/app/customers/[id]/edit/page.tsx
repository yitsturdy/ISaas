'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { customersApi, Customer, IndustryCategory, EmployeeSize } from '@/lib/api';

const INDUSTRIES: IndustryCategory[] = [
  'IT・テクノロジー','製造業','金融・保険','小売・EC',
  '医療・ヘルスケア','教育','不動産','サービス業','物流・運輸','その他',
];
const EMPLOYEE_SIZES: EmployeeSize[] = [
  '1〜10人','11〜50人','51〜100人','101〜300人','301〜1000人','1001人以上',
];

type FormData = Partial<Omit<Customer, 'id' | 'created_at'>>;

export default function EditCustomerPage() {
  const { token } = useAuth();
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();

  const [form, setForm]       = useState<FormData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!token) return;
    customersApi.get(token, Number(id))
      .then(c => setForm({
        name: c.name, company_id: c.company_id ?? '', domain: c.domain ?? '',
        industry_category: c.industry_category ?? undefined,
        employee_size: c.employee_size ?? undefined,
        service_tier: c.service_tier, website_url: c.website_url ?? '',
        is_existing_customer: c.is_existing_customer,
      }))
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErrors({});
    try {
      await customersApi.update(token, Number(id), form);
      router.push(`/customers/${id}`);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { name: [e.message ?? '更新に失敗しました。'] });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof FormData>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value as FormData[K] }));

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/customers" className="hover:text-blue-600">顧客管理</Link>
          <span>/</span>
          <Link href={`/customers/${id}`} className="hover:text-blue-600">{form.name}</Link>
          <span>/</span>
          <span className="text-gray-800">編集</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">顧客編集</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: '会社名 *', key: 'name', type: 'text' },
              { label: 'クライアントID', key: 'company_id', type: 'text' },
              { label: 'ドメイン', key: 'domain', type: 'text' },
              { label: 'WebサイトURL', key: 'website_url', type: 'url' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} value={String(form[key as keyof FormData] ?? '')} onChange={set(key as keyof FormData)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">業界カテゴリ</label>
              <select value={form.industry_category ?? ''} onChange={set('industry_category')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">従業員規模</label>
              <select value={form.employee_size ?? ''} onChange={set('employee_size')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {EMPLOYEE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ターゲットランク *</label>
              <select value={form.service_tier ?? 'C'} onChange={set('service_tier')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="A">A（最優先）</option>
                <option value="B">B（優先）</option>
                <option value="C">C（通常）</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_existing" checked={form.is_existing_customer ?? false}
                onChange={e => setForm(p => ({ ...p, is_existing_customer: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="is_existing" className="text-sm font-medium text-gray-700">既存顧客</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '更新中...' : '更新する'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
