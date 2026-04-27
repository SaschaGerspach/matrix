import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/my-skills');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in and redirects to my-skills', async ({ page }) => {
    await page.route('**/api/auth/login/', (route) =>
      route.fulfill({ json: { token: 'fake-token' } }),
    );
    await page.route('**/api/me/', (route) =>
      route.fulfill({
        json: {
          id: 1, first_name: 'Alice', last_name: 'A', full_name: 'Alice A',
          email: 'a@x.com', user: 1, is_team_lead: false, is_admin: false,
        },
      }),
    );
    await page.route('**/api/my-skills/**', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/my-skills/', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/notifications/unread_count/', (route) =>
      route.fulfill({ json: { count: 0 } }),
    );

    await page.goto('/login');
    await page.getByLabel('Username').fill('alice');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
