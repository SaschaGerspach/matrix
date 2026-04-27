import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { EmployeeProfile, EmployeeService } from '../../core/employee.service';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    BaseChartDirective,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './employee-profile.component.html',
  styleUrl: './employee-profile.component.scss',
})
export class EmployeeProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly employeeService = inject(EmployeeService);

  readonly profile = signal<EmployeeProfile | null>(null);
  readonly loading = signal(true);
  readonly displayedColumns = ['skill_name', 'category_name', 'level', 'status'];

  radarData: ChartConfiguration<'radar'>['data'] = { labels: [], datasets: [] };
  radarOptions: ChartConfiguration<'radar'>['options'] = {
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.employeeService.getProfile(id).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.buildRadarData(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildRadarData(p: EmployeeProfile): void {
    const labels = p.skills.map((s) => s.skill_name);
    const data = p.skills.map((s) => s.level);
    this.radarData = {
      labels,
      datasets: [
        {
          data,
          label: p.full_name,
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
          borderColor: 'rgba(63, 81, 181, 1)',
          pointBackgroundColor: 'rgba(63, 81, 181, 1)',
        },
      ],
    };
  }
}
