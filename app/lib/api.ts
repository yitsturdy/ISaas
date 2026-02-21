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
};
