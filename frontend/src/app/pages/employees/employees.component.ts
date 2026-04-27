import { Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Employee, EmployeeService } from '../../core/employee.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTableModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
})
export class EmployeesComponent implements OnInit {
  private readonly employees = inject(EmployeeService);

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
}
