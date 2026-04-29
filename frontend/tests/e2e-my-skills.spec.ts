import { test, expect } from './e2e-fixtures';

test.describe('My Skills E2E', () => {
  test('should display skill assignments for admin', async ({ adminPage: page }) => {
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('Django')).toBeVisible();
    await expect(page.getByText('Docker')).toBeVisible();
  });

  test('should display skill table columns', async ({ adminPage: page }) => {
    await expect(page.getByRole('columnheader', { name: 'Skill' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Level' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('should show skills for dev user', async ({ devPage: page }) => {
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('Kubernetes')).toBeVisible();
  });
});
