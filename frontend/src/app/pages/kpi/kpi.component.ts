import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { KpiEntry, LevelDistribution } from '../../core/skill.models';

const DOUGHNUT_COLORS = ['#ef5350', '#ff9800', '#fdd835', '#66bb6a', '#2e7d32'];

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, MatProgressSpinnerModule, BaseChartDirective, TranslateModule],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent implements OnInit {
  private readonly skillService = inject(SkillAnalyticsService);

  readonly data = signal<KpiEntry[]>([]);
  readonly distribution = signal<LevelDistribution | null>(null);
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

  readonly doughnutConfig = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const dist = this.distribution();
    if (!dist) return null;
    const levels = ['1', '2', '3', '4', '5'];
    const values = levels.map((l) => dist.overall[l] ?? 0);
    if (values.every((v) => v === 0)) return null;
    return {
      type: 'doughnut',
      data: {
        labels: levels.map((l) => `Level ${l}`),
        datasets: [{
          data: values,
          backgroundColor: DOUGHNUT_COLORS,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
        },
      },
    };
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.skillService.kpiData().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.skillService.levelDistribution().subscribe({
      next: (d) => this.distribution.set(d),
      error: () => {},
    });
  }
}
