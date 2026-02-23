import { authApi, customersApi, leadsApi } from '@/lib/api';

const mockFetch = global.fetch as jest.Mock;

const makeResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

beforeEach(() => {
  mockFetch.mockReset();
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost/api';
});

// ---- request 関数の基本動作 ----

describe('request 基本動作', () => {
  it('GET リクエストに Content-Type と Accept ヘッダーを付ける', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }));

    await authApi.me('token123');

    const [url, init] = mockFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Accept']).toBe('application/json');
  });

  it('token があれば Authorization: Bearer を付ける', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }));

    await authApi.me('mytoken');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer mytoken');
  });

  it('ok=true のとき data を返す', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ access_token: 'abc' }));

    const result = await authApi.guestLogin();
    expect(result).toEqual({ access_token: 'abc' });
  });

  it('ok=false のとき status/message/errors をスローする', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ message: 'Unauthorized', errors: { email: ['Invalid'] } }, false, 401)
    );

    await expect(authApi.me('bad')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
      errors: { email: ['Invalid'] },
    });
  });

  it('エラーレスポンスに message がなければデフォルトメッセージを使う', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, false, 500));

    await expect(authApi.me('bad')).rejects.toMatchObject({
      message: 'エラーが発生しました。',
    });
  });

  it('POST リクエストに JSON body を付ける', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ user: {}, access_token: 'tok', token_type: 'Bearer' })
    );

    await authApi.login({ email: 'a@b.com', password: 'pass' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pass' });
  });
});

// ---- authApi ----

describe('authApi', () => {
  it('login は POST /login を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ user: {}, access_token: 'tok', token_type: 'Bearer' })
    );

    await authApi.login({ email: 'x@x.com', password: 'pw' });

    expect(mockFetch.mock.calls[0][0]).toContain('/login');
  });

  it('guestLogin は POST /guest-login を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ user: {}, access_token: 'tok', token_type: 'Bearer' })
    );

    await authApi.guestLogin();

    expect(mockFetch.mock.calls[0][0]).toContain('/guest-login');
  });

  it('logout は Bearer ヘッダー付きで POST /logout を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ message: 'ok' }));

    await authApi.logout('mytoken');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/logout');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer mytoken');
  });

  it('me は GET /user を Bearer ヘッダーで呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }));

    await authApi.me('tok');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/user');
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization']).toBe('Bearer tok');
  });
});

// ---- customersApi ----

describe('customersApi.list クエリ文字列', () => {
  it('params からクエリ文字列を構築する', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 })
    );

    await customersApi.list('tok', { search: 'test', service_tier: 'A' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('search=test');
    expect(url).toContain('service_tier=A');
  });

  it('undefined の params はクエリ文字列に含めない', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 })
    );

    await customersApi.list('tok', { search: undefined, service_tier: 'B' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('search=');
    expect(url).toContain('service_tier=B');
  });
});

// ---- leadsApi ----

describe('leadsApi', () => {
  it('transition は POST /leads/:id/transition を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 5 }));

    await leadsApi.transition('tok', 5, { to_stage_id: 3 });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/leads/5/transition');
    expect(init.method).toBe('POST');
  });

  it('assign は PATCH /leads/:id/assign を呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 5 }));

    await leadsApi.assign('tok', 5, null);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/leads/5/assign');
    expect(init.method).toBe('PATCH');
  });
});
