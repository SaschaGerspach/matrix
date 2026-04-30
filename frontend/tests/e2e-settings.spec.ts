import { test, expect } from './e2e-fixtures';

test.describe('Settings E2E', () => {
  test('should display settings page', async ({ adminPage: page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    await expect(page.getByLabel(/Current Password|Aktuelles Passwort/i)).toBeVisible();
    await expect(page.getByLabel(/New Password|Neues Passwort/i).first()).toBeVisible();
  });

  test('should show language selector', async ({ adminPage: page }) => {
    await page.goto('/settings');

    await expect(page.getByText(/Language|Sprache/i).first()).toBeVisible();
  });

  test('should disable submit when fields are empty', async ({ adminPage: page }) => {
    await page.goto('/settings');

    const submitButton = page.getByRole('button', { name: /Save|Speichern/i });
    await expect(submitButton).toBeDisabled();
  });
});
