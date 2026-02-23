import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // セッションをクリア
    await page.evaluate(() => localStorage.clear());
  });

  test('未認証で /dashboard にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('ゲストログイン → ダッシュボード表示 → ログアウト', async ({ page }) => {
    // ログインページへ遷移
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // ゲストログインボタンをクリック
    await page.getByRole('button', { name: /ゲスト/i }).click();

    // ダッシュボードに遷移することを確認
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText('ダッシュボード')).toBeVisible();

    // ログアウトボタンをクリック
    await page.getByRole('button', { name: /ログアウト/i }).click();

    // ログインページに戻ることを確認
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('誤認証情報でエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/メールアドレス/i).fill('wrong@example.com');
    await page.getByLabel(/パスワード/i).fill('wrongpassword');
    await page.getByRole('button', { name: /ログイン/i }).click();

    // エラーメッセージが表示されることを確認
    await expect(
      page.getByText(/メールアドレスまたはパスワードが正しくありません/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
