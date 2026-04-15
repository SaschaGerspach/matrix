import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Employee, EmployeeService } from '../../core/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatTableModule, MatToolbarModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
})
export class EmployeesComponent implements OnInit {
  private readonly employees = inject(EmployeeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly data = signal<Employee[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly displayedColumns = ['first_name', 'last_name', 'email'];

  ngOnInit(): void {
    this.loading.set(true);
    this.employees.list().subscribe({
      next: (list) => {
        this.data.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load employees.');
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
