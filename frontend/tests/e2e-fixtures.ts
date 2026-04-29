import { test as base, Page, expect } from '@playwright/test';

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/my-skills/);
}

export const test = base.extend<{ adminPage: Page; devPage: Page }>({
  adminPage: async ({ page }, use) => {
    await login(page, 'admin', 'admin123');
    await use(page);
  },
  devPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, 'dev', 'dev12345');
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
