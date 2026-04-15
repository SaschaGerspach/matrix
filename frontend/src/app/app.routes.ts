import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'employees',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/employees/employees.component').then((m) => m.EmployeesComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
];
