import { test, expect } from './e2e-fixtures';

test.describe('Employees E2E', () => {
  test('should list employees in table', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await expect(page).toHaveURL(/\/employees/);

    await expect(page.getByRole('cell', { name: 'Alice', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bob', exact: true })).toBeVisible();
  });

  test('should navigate to employee profile on click', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await page.getByRole('row', { name: /Alice/ }).click();

    await expect(page).toHaveURL(/\/employees\/\d+/);
    await expect(page.getByText('Alice Admin')).toBeVisible();
    await expect(page.getByText('alice@example.com')).toBeVisible();
  });

  test('should show skills on employee profile', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await page.getByRole('row', { name: /Alice/ }).click();

    await expect(page.getByRole('cell', { name: 'Python' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Django' })).toBeVisible();
  });

  test('should navigate back from profile', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await page.getByRole('row', { name: /Alice/ }).click();
    await expect(page).toHaveURL(/\/employees\/\d+/);

    await page.getByRole('link', { name: /Back|←/ }).click();
    await expect(page).toHaveURL(/\/employees$/);
  });
});
