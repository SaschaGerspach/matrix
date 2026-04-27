import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../environments/environment';

export interface TeamKpi {
  team_id: number;
  team_name: string;
  member_count: number;
  avg_level: number;
  coverage: number;
  total_assignments: number;
  confirmed_ratio: number;
}

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, MatProgressSpinnerModule, BaseChartDirective, TranslateModule],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly data = signal<TeamKpi[]>([]);
  readonly loading = signal(false);

  readonly barChartConfig = computed<ChartConfiguration<'bar'>>(() => {
    const teams = this.data();
    return {
      type: 'bar',
      data: {
        labels: teams.map((t) => t.team_name),
        datasets: [
          {
            label: 'Avg. Level',
            data: teams.map((t) => t.avg_level),
            backgroundColor: '#3f51b5',
          },
          {
            label: 'Coverage %',
            data: teams.map((t) => t.coverage),
            backgroundColor: '#ff4081',
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    };
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.http.get<TeamKpi[]>(`${environment.apiUrl}/kpi/`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
