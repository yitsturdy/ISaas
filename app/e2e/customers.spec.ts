import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

// ゲストログインでトークンを取得してlocalStorageにセットするヘルパー
async function loginAsGuest(page: import('@playwright/test').Page) {
  const apiContext = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await apiContext.post('/guest-login');
  const body = await res.json() as { access_token: string; user: Record<string, unknown> };

  // Next.js アプリのページを開いてから localStorage にセット
  await page.goto('/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token: body.access_token, user: body.user });
}

test.describe('顧客管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test('顧客一覧ページが表示される', async ({ page }) => {
    await page.goto('/customers');

    // ページタイトルが表示されること
    await expect(page.getByRole('heading', { name: /顧客/i })).toBeVisible({ timeout: 10_000 });

    // テーブルヘッダーが存在すること
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('検索フィールドが機能する', async ({ page }) => {
    await page.goto('/customers');

    // 検索ボックスに文字を入力
    const searchInput = page.getByPlaceholder(/検索/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト');
      await searchInput.press('Enter');

      // URL またはページ内にフィルタが反映されることを確認
      await expect(page).toHaveURL(/search=/, { timeout: 5_000 });
    }
  });

  test('ナビゲーションに顧客管理リンクがある', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /顧客管理/i })).toBeVisible();
  });
});
