import { test, expect } from './e2e-fixtures';

test.describe('Team Review E2E', () => {
  test('should display pending assignments', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Team Review' }).click();
    await expect(page).toHaveURL(/\/team-review/);

    await expect(page.getByRole('cell', { name: /Docker|Kubernetes/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('should show confirm button for pending items', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Team Review' }).click();

    await expect(page.getByRole('button', { name: /Confirm/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('non-lead user should not access team review', async ({ devPage: page }) => {
    await page.goto('/team-review');

    await expect(page).not.toHaveURL(/\/team-review/);
  });
});
