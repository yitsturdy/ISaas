import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// ---- モック設定 ----

const mockPush    = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// authApi のモック（関数レベルで制御できるよう jest.fn() を使用）
jest.mock('@/lib/api', () => ({
  authApi: {
    me:         jest.fn(),
    login:      jest.fn(),
    register:   jest.fn(),
    guestLogin: jest.fn(),
    logout:     jest.fn(),
  },
}));

import { authApi } from '@/lib/api';
const mockMe         = authApi.me         as jest.Mock;
const mockLogin      = authApi.login      as jest.Mock;
const mockGuestLogin = authApi.guestLogin as jest.Mock;
const mockLogout     = authApi.logout     as jest.Mock;

// ---- ヘルパー ----

const MOCK_USER = {
  id: 1, name: 'Test User', email: 'test@example.com',
  username: null, role: 'IS', status: 'active',
  join_at: null, monthly_target_count: 0, extension_number: null,
} as const;

const MOCK_TOKEN = 'mock-access-token';

function TestConsumer() {
  const { user, token, loading, login, guestLogin, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.name ?? 'null'}</span>
      <span data-testid="token">{token ?? 'null'}</span>
      <button onClick={() => login('a@b.com', 'pw')}>login</button>
      <button onClick={() => guestLogin()}>guestLogin</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

// ---- テスト ----

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockPush.mockClear();
});

describe('AuthProvider の初期化', () => {
  it('localStorage にトークンがなければ loading=false になる', async () => {
    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('localStorage にトークンがあれば authApi.me() を呼ぶ', async () => {
    localStorage.setItem('auth_token', MOCK_TOKEN);
    mockMe.mockResolvedValueOnce(MOCK_USER);

    renderWithProvider();

    await waitFor(() => expect(mockMe).toHaveBeenCalledWith(MOCK_TOKEN));
    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe(MOCK_USER.name)
    );
    expect(screen.getByTestId('token').textContent).toBe(MOCK_TOKEN);
  });

  it('authApi.me() が失敗したら localStorage からトークンを削除する', async () => {
    localStorage.setItem('auth_token', MOCK_TOKEN);
    mockMe.mockRejectedValueOnce(new Error('Unauthorized'));

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});

describe('login', () => {
  it('成功したら token を保存して /dashboard に push する', async () => {
    mockLogin.mockResolvedValueOnce({ access_token: MOCK_TOKEN, user: MOCK_USER, token_type: 'Bearer' });
    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(localStorage.getItem('auth_token')).toBe(MOCK_TOKEN);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByTestId('user').textContent).toBe(MOCK_USER.name);
  });
});

describe('guestLogin', () => {
  it('成功したら token を保存して /dashboard に push する', async () => {
    mockGuestLogin.mockResolvedValueOnce({ access_token: MOCK_TOKEN, user: MOCK_USER, token_type: 'Bearer' });
    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('guestLogin').click();
    });

    expect(localStorage.getItem('auth_token')).toBe(MOCK_TOKEN);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});

describe('logout', () => {
  it('token と user をクリアして /login に push する', async () => {
    localStorage.setItem('auth_token', MOCK_TOKEN);
    mockMe.mockResolvedValueOnce(MOCK_USER);
    mockLogout.mockResolvedValueOnce({ message: 'ok' });

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe(MOCK_USER.name)
    );

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('authApi.logout() が失敗しても localStorage はクリアされる', async () => {
    localStorage.setItem('auth_token', MOCK_TOKEN);
    mockMe.mockResolvedValueOnce(MOCK_USER);
    mockLogout.mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe(MOCK_USER.name)
    );

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

describe('useAuth', () => {
  it('AuthProvider の外で使うと Error をスローする', () => {
    function BadComponent() {
      useAuth();
      return null;
    }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
