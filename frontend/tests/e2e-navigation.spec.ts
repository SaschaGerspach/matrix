import { test, expect } from './e2e-fixtures';

test.describe('Navigation E2E', () => {
  test('admin should see all navigation items', async ({ adminPage: page }) => {
    await expect(page.getByRole('link', { name: 'My Skills' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'KPIs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team Review' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('non-lead user should not see team lead links', async ({ devPage: page }) => {
    await expect(page.getByRole('link', { name: 'My Skills' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team Review' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  });

  test('should navigate to dashboard', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Skill Matrix' })).toBeVisible();
  });

  test('should navigate to employees', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByRole('cell', { name: 'Alice', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bob', exact: true })).toBeVisible();
  });

  test('should navigate to KPIs', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'KPIs' }).click();
    await expect(page).toHaveURL(/\/kpi/);
  });
});
