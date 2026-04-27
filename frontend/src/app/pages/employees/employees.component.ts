import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { Employee, EmployeeService } from '../../core/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [MatPaginatorModule, MatProgressSpinnerModule, MatTableModule, TranslateModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);

  readonly data = signal<Employee[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly displayedColumns = ['first_name', 'last_name', 'email'];
  readonly pageSize = 25;

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.employeeService.list(page).subscribe({
      next: (res) => {
        this.data.set(res.results);
        this.totalCount.set(res.count);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load employees.');
        this.loading.set(false);
      },
    });
  }

  onPage(event: PageEvent): void {
    this.loadPage(event.pageIndex + 1);
  }

  openProfile(employee: Employee): void {
    this.router.navigate(['/employees', employee.id]);
  }
}
