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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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

export type AuthResponse = {
  user: User;
  access_token: string;
  token_type: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
};

export const authApi = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    request<AuthResponse>('/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/login', { method: 'POST', body: data }),

  guestLogin: () =>
    request<AuthResponse>('/guest-login', { method: 'POST' }),

  logout: (token: string) =>
    request<{ message: string }>('/logout', { method: 'POST', token }),

  me: (token: string) =>
    request<User>('/user', { token }),
};
