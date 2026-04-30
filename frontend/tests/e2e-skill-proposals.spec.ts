import { test, expect } from './e2e-fixtures';

test.describe('Skill Proposals E2E', () => {
  test('should display proposals page', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: /Proposals/i }).click();
    await expect(page).toHaveURL(/\/skill-proposals/);
  });

  test('should show existing proposal', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: /Proposals/i }).click();

    await expect(page.getByRole('cell', { name: 'Terraform' })).toBeVisible({ timeout: 10_000 });
  });

  test('should open and close proposal form', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: /Proposals/i }).click();

    await page.getByRole('button', { name: /Propose/i }).click();
    await expect(page.getByLabel(/Skill Name|Name/i)).toBeVisible();

    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByLabel(/Skill Name|Name/i)).not.toBeVisible();
  });

  test('dev user should see own proposals', async ({ devPage: page }) => {
    await page.getByRole('link', { name: /Proposals/i }).click();
    await expect(page).toHaveURL(/\/skill-proposals/);

    await expect(page.getByRole('cell', { name: 'Terraform' })).toBeVisible({ timeout: 10_000 });
  });
});
