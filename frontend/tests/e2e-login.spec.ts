import { test, expect } from '@playwright/test';

test.describe('Login E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/my-skills');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/my-skills/);
    await expect(page.getByRole('heading', { name: 'My Skills' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/my-skills/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
