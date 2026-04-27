import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

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
        path: 'employees',
        loadComponent: () =>
          import('./pages/employees/employees.component').then((m) => m.EmployeesComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'my-skills' },
    ],
  },
];
