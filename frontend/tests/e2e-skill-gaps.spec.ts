import { test, expect } from './e2e-fixtures';

test.describe('Skill Gaps E2E', () => {
  test('should display skill gaps page', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: /Skill Gaps/i }).click();
    await expect(page).toHaveURL(/\/skill-gaps/);
  });

  test('should show gap for Kubernetes requirement', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: /Skill Gaps/i }).click();

    await expect(page.getByRole('cell', { name: 'Kubernetes' }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('non-lead user should not access skill gaps', async ({ devPage: page }) => {
    await page.goto('/skill-gaps');

    await expect(page).not.toHaveURL(/\/skill-gaps/);
  });
});
