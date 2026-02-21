'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { customersApi, IndustryCategory, EmployeeSize, ServiceTier } from '@/lib/api';

const INDUSTRIES: IndustryCategory[] = [
  'IT・テクノロジー','製造業','金融・保険','小売・EC',
  '医療・ヘルスケア','教育','不動産','サービス業','物流・運輸','その他',
];
const EMPLOYEE_SIZES: EmployeeSize[] = [
  '1〜10人','11〜50人','51〜100人','101〜300人','301〜1000人','1001人以上',
];

export default function NewCustomerPage() {
  const { token, user: me } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', company_id: '', domain: '', website_url: '',
    industry_category: '' as IndustryCategory | '',
    employee_size: '' as EmployeeSize | '',
    service_tier: 'C' as ServiceTier,
    is_existing_customer: false,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  if (me?.role !== 'Admin' && me?.role !== 'Manager') {
    router.push('/customers');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        industry_category: form.industry_category || null,
        employee_size: form.employee_size || null,
        company_id: form.company_id || null,
        domain: form.domain || null,
        website_url: form.website_url || null,
      };
      const created = await customersApi.create(token, payload as Parameters<typeof customersApi.create>[1]);
      router.push(`/customers/${created.id}`);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      setErrors(e.errors ?? { name: [e.message ?? '作成に失敗しました。'] });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/customers" className="hover:text-blue-600">顧客管理</Link>
          <span>/</span>
          <span className="text-gray-800">新規追加</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-6">顧客追加</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: '会社名 *', key: 'name', type: 'text', required: true },
              { label: 'クライアントID', key: 'company_id', type: 'text', required: false },
              { label: 'ドメイン', key: 'domain', type: 'text', required: false },
              { label: 'WebサイトURL', key: 'website_url', type: 'url', required: false },
            ].map(({ label, key, type, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type} required={required} value={String(form[key as keyof typeof form])} onChange={set(key as keyof typeof form)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">業界カテゴリ</label>
              <select value={form.industry_category} onChange={set('industry_category')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">従業員規模</label>
              <select value={form.employee_size} onChange={set('employee_size')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">選択してください</option>
                {EMPLOYEE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ターゲットランク *</label>
              <select value={form.service_tier} onChange={set('service_tier')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="A">A（最優先）</option>
                <option value="B">B（優先）</option>
                <option value="C">C（通常）</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_existing" checked={form.is_existing_customer}
                onChange={e => setForm(p => ({ ...p, is_existing_customer: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="is_existing" className="text-sm font-medium text-gray-700">既存顧客</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '作成中...' : '追加する'}
              </button>
              <button type="button" onClick={() => router.push('/customers')}
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
