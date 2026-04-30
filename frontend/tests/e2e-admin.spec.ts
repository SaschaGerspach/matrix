import { test, expect } from './e2e-fixtures';

test.describe('Admin E2E', () => {
  test('should display admin page with tabs', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);

    await expect(page.getByRole('tab', { name: /Categories/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Skills/i })).toBeVisible();
  });

  test('should show existing categories', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Admin' }).click();

    await expect(page.getByRole('cell', { name: 'Programming' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: 'DevOps' }).first()).toBeVisible();
  });

  test('should show skills tab with existing skills', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('tab', { name: /Skills/i }).click();

    await expect(page.getByRole('cell', { name: 'Python' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: 'Django' })).toBeVisible();
  });

  test('non-admin should not access admin page', async ({ devPage: page }) => {
    await page.goto('/admin');

    await expect(page).not.toHaveURL(/\/admin$/);
  });
});
