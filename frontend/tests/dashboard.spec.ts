import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test('shows skill matrix table', async ({ authedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Skill Matrix' })).toBeVisible();
    await expect(page.getByText('Alice Admin')).toBeVisible();
    await expect(page.getByText('Bob Dev')).toBeVisible();
  });

  test('shows export buttons', async ({ authedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Skill Matrix' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
  });

  test('shows filter controls', async ({ authedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Skill Matrix' })).toBeVisible();
    await expect(page.getByLabel('Search')).toBeVisible();
    await expect(page.getByLabel('Team')).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
  });
});
