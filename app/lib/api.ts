const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, errors: data.errors ?? null, message: data.message ?? 'エラーが発生しました。' };
  }
  return data as T;
}

// ---- 型定義 ----
export type Role   = 'Admin' | 'Manager' | 'IS';
export type Status = 'active' | 'onboarding' | 'inactive';

export type User = {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: Role;
  status: Status;
  join_at: string | null;
  monthly_target_count: number;
  extension_number: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AuthResponse = {
  user: User;
  access_token: string;
  token_type: string;
};

export type UserParams = {
  search?: string;
  role?: Role;
  status?: Status;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
};

// ---- 認証 API ----
export const authApi = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    request<AuthResponse>('/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/login', { method: 'POST', body: data }),
  guestLogin: () => request<AuthResponse>('/guest-login', { method: 'POST' }),
  logout: (token: string) => request<{ message: string }>('/logout', { method: 'POST', token }),
  me: (token: string) => request<User>('/user', { token }),
};

// ---- 顧客管理 型定義 ----
export type ServiceTier      = 'A' | 'B' | 'C';
export type IndustryCategory =
  | 'IT・テクノロジー' | '製造業' | '金融・保険' | '小売・EC'
  | '医療・ヘルスケア' | '教育' | '不動産' | 'サービス業' | '物流・運輸' | 'その他';
export type EmployeeSize =
  | '1〜10人' | '11〜50人' | '51〜100人' | '101〜300人' | '301〜1000人' | '1001人以上';

export type Customer = {
  id: number;
  company_id: string | null;
  name: string;
  domain: string | null;
  industry_category: IndustryCategory | null;
  employee_size: EmployeeSize | null;
  service_tier: ServiceTier;
  website_url: string | null;
  is_existing_customer: boolean;
  created_at: string;
};

export type CustomerParams = {
  search?: string;
  industry_category?: IndustryCategory;
  service_tier?: ServiceTier;
  is_existing_customer?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
};

// ---- ユーザー管理 API ----
export const usersApi = {
  list: (token: string, params: UserParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<PaginatedResponse<User>>(`/users${qs ? '?' + qs : ''}`, { token });
  },
  get: (token: string, id: number) =>
    request<User>(`/users/${id}`, { token }),
  create: (token: string, data: Partial<User> & { password: string }) =>
    request<User>('/users', { method: 'POST', body: data, token }),
  update: (token: string, id: number, data: Partial<User> & { password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: data, token }),
  delete: (token: string, id: number) =>
    request<{ message: string }>(`/users/${id}`, { method: 'DELETE', token }),
};

// ---- リード管理 型定義 ----
export type LeadStage = {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  reassignment_threshold_days: number | null;
  created_at: string;
  updated_at: string;
};

export type LeadStageHistory = {
  id: number;
  lead_id: number;
  from_stage_id: number | null;
  to_stage_id: number;
  changed_by: number | null;
  reason_code: string | null;
  stay_days: number | null;
  created_at: string;
  from_stage: LeadStage | null;
  to_stage: LeadStage;
  changed_by_user: User | null;
};

export type Lead = {
  id: number;
  customer_id: number;
  owner_id: number | null;
  current_stage_id: number | null;
  title: string;
  note: string | null;
  last_activity_at: string | null;
  stage_updated_at: string | null;
  total_touch_count: number;
  created_at: string;
  customer: Customer;
  owner: User | null;
  current_stage: LeadStage | null;
  stage_histories?: LeadStageHistory[];
};

export type LeadParams = {
  search?: string;
  stage_id?: number;
  owner_id?: number;
  customer_id?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
};

// ---- 顧客管理 API ----
export const customersApi = {
  list: (token: string, params: CustomerParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<PaginatedResponse<Customer>>(`/customers${qs ? '?' + qs : ''}`, { token });
  },
  get: (token: string, id: number) =>
    request<Customer>(`/customers/${id}`, { token }),
  create: (token: string, data: Omit<Customer, 'id' | 'created_at'>) =>
    request<Customer>('/customers', { method: 'POST', body: data, token }),
  update: (token: string, id: number, data: Partial<Omit<Customer, 'id' | 'created_at'>>) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: data, token }),
  delete: (token: string, id: number) =>
    request<{ message: string }>(`/customers/${id}`, { method: 'DELETE', token }),
  export: (token: string, params: CustomerParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    const filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    return downloadCsv(`/customers/export${qs ? '?' + qs : ''}`, token, filename);
  },
  import: (token: string, file: File) => uploadCsv('/customers/import', token, file),
};

// ---- リードステージ API ----
export const leadStagesApi = {
  list: (token: string) =>
    request<LeadStage[]>('/lead-stages', { token }),
  get: (token: string, id: number) =>
    request<LeadStage>(`/lead-stages/${id}`, { token }),
  create: (token: string, data: Omit<LeadStage, 'id' | 'created_at' | 'updated_at'>) =>
    request<LeadStage>('/lead-stages', { method: 'POST', body: data, token }),
  update: (token: string, id: number, data: Partial<Omit<LeadStage, 'id' | 'created_at' | 'updated_at'>>) =>
    request<LeadStage>(`/lead-stages/${id}`, { method: 'PUT', body: data, token }),
  delete: (token: string, id: number) =>
    request<{ message: string }>(`/lead-stages/${id}`, { method: 'DELETE', token }),
};

// ---- CSV ダウンロードヘルパー ----
async function downloadCsv(endpoint: string, token: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
  });
  if (!res.ok) throw { status: res.status, message: 'ダウンロードに失敗しました。' };
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- CSV インポートヘルパー ----
export type ImportResult = { success_count: number; errors: { row: number; message: string }[] };

async function uploadCsv(endpoint: string, token: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, errors: data.errors ?? null, message: data.message ?? 'インポートに失敗しました。' };
  return data as ImportResult;
}

// ---- リード管理 API ----
export const leadsApi = {
  list: (token: string, params: LeadParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<PaginatedResponse<Lead>>(`/leads${qs ? '?' + qs : ''}`, { token });
  },
  get: (token: string, id: number) =>
    request<Lead>(`/leads/${id}`, { token }),
  create: (token: string, data: { customer_id: number; title: string; owner_id?: number | null; current_stage_id?: number | null; note?: string | null }) =>
    request<Lead>('/leads', { method: 'POST', body: data, token }),
  update: (token: string, id: number, data: Partial<{ customer_id: number; title: string; owner_id: number | null; current_stage_id: number | null; note: string | null }>) =>
    request<Lead>(`/leads/${id}`, { method: 'PUT', body: data, token }),
  delete: (token: string, id: number) =>
    request<{ message: string }>(`/leads/${id}`, { method: 'DELETE', token }),
  transition: (token: string, id: number, data: { to_stage_id: number; reason_code?: string }) =>
    request<Lead>(`/leads/${id}/transition`, { method: 'POST', body: data, token }),
  assign: (token: string, id: number, owner_id: number | null) =>
    request<Lead>(`/leads/${id}/assign`, { method: 'PATCH', body: { owner_id }, token }),
  export: (token: string, params: LeadParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    const filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    return downloadCsv(`/leads/export${qs ? '?' + qs : ''}`, token, filename);
  },
  import: (token: string, file: File) => uploadCsv('/leads/import', token, file),
};

// ---- ダッシュボード 型定義 ----
export type LeadsByStage = { stage_id: number; stage_name: string; count: number };

export type DashboardStats = {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  conversion_rate: number;
  leads_by_stage: LeadsByStage[];
  neglected_leads_count: number;
};

export type PerformanceData = {
  user_id: number;
  user_name: string;
  role: Role;
  monthly_target_count: number;
  active_leads_count: number;
  won_leads_count: number;
  achievement_rate: number | null;
};

export type NeglectedLead = {
  lead_id: number;
  title: string;
  owner_name: string;
  stage_name: string;
  days_since_last_activity: number;
  threshold_days: number;
};

// ---- ダッシュボード API ----
export const dashboardApi = {
  stats: (token: string) =>
    request<DashboardStats>('/dashboard', { token }),
  performance: (token: string) =>
    request<PerformanceData[]>('/dashboard/performance', { token }),
  neglectedLeads: (token: string) =>
    request<NeglectedLead[]>('/dashboard/neglected-leads', { token }),
};

// ---- ダッシュボード 型定義 ----
export type LeadsByStage = {
  stage_id: number;
  stage_name: string;
  count: number;
};

export type DashboardStats = {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  conversion_rate: number;
  neglected_leads_count: number;
  leads_by_stage: LeadsByStage[];
};

export type PerformanceData = {
  user_id: number;
  user_name: string;
  monthly_target_count: number;
  active_leads_count: number;
  won_leads_count: number;
  achievement_rate: number;
};

export type NeglectedLead = {
  lead_id: number;
  title: string;
  owner_name: string;
  stage_name: string;
  days_since_last_activity: number | null;
  threshold_days: number;
};

// ---- ダッシュボード API ----
export const dashboardApi = {
  stats: (token: string) =>
    request<DashboardStats>('/dashboard', { token }),
  performance: (token: string) =>
    request<PerformanceData[]>('/dashboard/performance', { token }),
  neglectedLeads: (token: string) =>
    request<NeglectedLead[]>('/dashboard/neglected-leads', { token }),
};
