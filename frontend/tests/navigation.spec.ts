import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test('shows all nav links for admin team lead', async ({ authedPage: page }) => {
    await page.goto('/my-skills');
    await expect(page.getByRole('link', { name: 'My Skills' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Skill Gaps' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team Comparison' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('navigates to employees page', async ({ authedPage: page }) => {
    await page.goto('/my-skills');
    await page.getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByRole('cell', { name: 'Alice', exact: true })).toBeVisible();
  });

  test('navigates to dashboard', async ({ authedPage: page }) => {
    await page.goto('/my-skills');
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Skill Matrix' })).toBeVisible();
  });

  test('sign out button exists', async ({ authedPage: page }) => {
    await page.goto('/my-skills');
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });
});
