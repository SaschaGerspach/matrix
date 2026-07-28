import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { KpiEntry, LevelDistribution } from '../../core/skill.models';
import { CountUpDirective } from './count-up.directive';

// Mirrors the matrix heat scale so a level means the same colour everywhere.
const LEVEL_COLORS = ['#d7f0e6', '#8ed9c0', '#4cbf9d', '#1d9e75', '#0f6e56'];
const CHART_PRIMARY = '#3b5bdb';
const CHART_TERTIARY = '#9333a3';

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [CountUpDirective, MatIconModule, BaseChartDirective, TranslateModule],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent implements OnInit {
  private readonly skillService = inject(SkillAnalyticsService);

  readonly data = signal<KpiEntry[]>([]);
  readonly distribution = signal<LevelDistribution | null>(null);
  readonly loading = signal(false);
  readonly skeletonCards = [1, 2, 3];

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
            backgroundColor: CHART_PRIMARY,
          },
          {
            label: 'Coverage %',
            data: teams.map((t) => t.coverage),
            backgroundColor: CHART_TERTIARY,
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
          backgroundColor: LEVEL_COLORS,
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
