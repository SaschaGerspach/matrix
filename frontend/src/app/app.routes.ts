import { Routes } from '@angular/router';

import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';
import { teamLeadGuard } from './core/team-lead.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'my-skills',
        loadComponent: () =>
          import('./pages/my-skills/my-skills.component').then((m) => m.MySkillsComponent),
      },
      {
        path: 'team-review',
        canActivate: [teamLeadGuard],
        loadComponent: () =>
          import('./pages/team-review/team-review.component').then((m) => m.TeamReviewComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'skill-gaps',
        canActivate: [teamLeadGuard],
        loadComponent: () =>
          import('./pages/skill-gaps/skill-gaps.component').then((m) => m.SkillGapsComponent),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./pages/employees/employees.component').then((m) => m.EmployeesComponent),
      },
      {
        path: 'employees/:id',
        loadComponent: () =>
          import('./pages/employee-profile/employee-profile.component').then((m) => m.EmployeeProfileComponent),
      },
      {
        path: 'team-comparison',
        canActivate: [teamLeadGuard],
        loadComponent: () =>
          import('./pages/team-comparison/team-comparison.component').then((m) => m.TeamComparisonComponent),
      },
      {
        path: 'kpi',
        canActivate: [teamLeadGuard],
        loadComponent: () =>
          import('./pages/kpi/kpi.component').then((m) => m.KpiComponent),
      },
      {
        path: 'skill-proposals',
        loadComponent: () =>
          import('./pages/skill-proposals/skill-proposals.component').then((m) => m.SkillProposalsComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'my-skills' },
    ],
  },
];
