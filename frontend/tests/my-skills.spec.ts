import { test, expect } from './fixtures';

test.describe('My Skills', () => {
  test('shows skills list', async ({ authedPage: page }) => {
    await page.goto('/my-skills');
    await expect(page.getByRole('heading', { name: 'My Skills' })).toBeVisible();
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('Programming')).toBeVisible();
  });

  test('shows empty state when no skills', async ({ page }) => {
    await page.route('**/api/me/', (route) =>
      route.fulfill({
        json: {
          id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
          email: 'a@b.com', user: 1, is_team_lead: false, is_admin: false,
        },
      }),
    );
    await page.route('**/api/my-skills/**', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/my-skills/', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/notifications/unread_count/', (route) =>
      route.fulfill({ json: { count: 0 } }),
    );
    await page.route('**/api/skills/**', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/skills/', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/skill-categories/**', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/skill-categories/', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/skill-recommendations/**', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/skill-recommendations/', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/notifications/**', (route) =>
      route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }),
    );
    await page.addInitScript(() => {
      localStorage.setItem('matrix.loggedIn', '1');
    });

    await page.goto('/my-skills');
    await expect(page.getByText('No skills assigned yet')).toBeVisible();
  });
});
