import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { Employee, EmployeeService } from '../../core/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule, MatTableModule, RouterLink, TranslateModule],
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
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly pageSize = 25;
  searchTerm = '';

  ngOnInit(): void {
    this.loadPage(1);
  }

  onSearch(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.employeeService.list(page, this.searchTerm.trim()).subscribe({
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
