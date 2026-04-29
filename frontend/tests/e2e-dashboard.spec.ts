import { test, expect } from './e2e-fixtures';

test.describe('Dashboard E2E', () => {
  test('should display skill matrix with employees', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.locator('.employee-link').first()).toBeVisible({ timeout: 10_000 });
    const names = await page.locator('.employee-link').allTextContents();
    expect(names.some(n => n.includes('Alice'))).toBeTruthy();
  });

  test('should have export buttons', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });
});
