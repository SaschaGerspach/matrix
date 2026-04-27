import { test as base, Page } from '@playwright/test';

const meProfile = {
  id: 1, first_name: 'Alice', last_name: 'Admin', full_name: 'Alice Admin',
  email: 'alice@x.com', user: 1, is_team_lead: true, is_admin: true,
};

const matrixData = {
  employees: [
    { id: 1, full_name: 'Alice Admin' },
    { id: 2, full_name: 'Bob Dev' },
  ],
  skills: [
    { id: 10, name: 'Python', category_name: 'Programming' },
    { id: 11, name: 'Docker', category_name: 'Ops' },
  ],
  assignments: [
    { id: 100, employee: 1, skill: 10, level: 4, status: 'confirmed' },
    { id: 101, employee: 2, skill: 11, level: 2, status: 'pending' },
  ],
};

const mySkills = [
  { id: 100, skill: 10, skill_name: 'Python', category_name: 'Programming', level: 4, status: 'confirmed' },
];

const teams = [{ id: 1, name: 'Alpha', department: 1, department_name: 'Engineering' }];
const categories = [{ id: 1, name: 'Programming' }, { id: 2, name: 'Ops' }];

const employees = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, first_name: 'Alice', last_name: 'Admin', email: 'alice@x.com' },
    { id: 2, first_name: 'Bob', last_name: 'Dev', email: 'bob@x.com' },
  ],
};

async function mockApi(page: Page) {
  await page.route('**/api/me/', (route) => route.fulfill({ json: meProfile }));
  await page.route('**/api/skill-matrix/**', (route) => route.fulfill({ json: matrixData }));
  await page.route('**/api/my-skills/**', (route) => route.fulfill({ json: mySkills }));
  await page.route('**/api/my-skills/', (route) => route.fulfill({ json: mySkills }));
  await page.route('**/api/teams/**', (route) => route.fulfill({ json: teams }));
  await page.route('**/api/teams/', (route) => route.fulfill({ json: teams }));
  await page.route('**/api/skill-categories/**', (route) => route.fulfill({ json: categories }));
  await page.route('**/api/skill-categories/', (route) => route.fulfill({ json: categories }));
  await page.route('**/api/employees/**', (route) => route.fulfill({ json: employees }));
  await page.route('**/api/employees/', (route) => route.fulfill({ json: employees }));
  await page.route('**/api/notifications/unread_count/', (route) => route.fulfill({ json: { count: 0 } }));
  await page.route('**/api/notifications/**', (route) =>
    route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }),
  );
  await page.route('**/api/notifications/', (route) =>
    route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }),
  );
  await page.route('**/api/skill-history/**', (route) =>
    route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }),
  );
  await page.route('**/api/skill-trends/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/team-assignments/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/team-assignments/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/skill-gaps/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/skill-requirements/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/skill-requirements/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/skills/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/skills/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/kpi/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/kpi/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/role-templates/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/role-templates/', (route) => route.fulfill({ json: [] }));
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('matrix.authToken', 'fake-token');
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
