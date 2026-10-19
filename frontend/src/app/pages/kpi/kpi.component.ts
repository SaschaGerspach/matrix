import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { CountKeyPipe } from '../../core/count-key.pipe';
import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { ThemeService } from '../../core/theme.service';
import { KpiEntry, LevelDistribution } from '../../core/skill.models';
import { CountUpDirective } from './count-up.directive';

// Mirrors the matrix heat scale so a level means the same colour everywhere.
const LEVEL_COLORS = ['#e8f6f1', '#c2e9dc', '#8ed9c0', '#4cbf9d', '#168f6d'];
const LEVEL_COLORS_DARK = ['#10312a', '#16483c', '#1c6350', '#248069', '#2da184'];
const CHART_PRIMARY = '#3b5bdb';
const CHART_SECONDARY = '#515b8e';

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [CountKeyPipe, CountUpDirective, MatButtonModule, MatIconModule, RouterLink, BaseChartDirective, TranslateModule],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent implements OnInit {
  private readonly skillService = inject(SkillAnalyticsService);
  private readonly themeService = inject(ThemeService);

  readonly data = signal<KpiEntry[]>([]);
  readonly distribution = signal<LevelDistribution | null>(null);
  readonly loading = signal(false);
  readonly skeletonCards = [1, 2, 3];
  private readonly expanded = signal(new Set<number>());

  isExpanded(teamId: number): boolean {
    return this.expanded().has(teamId);
  }

  toggleDetails(teamId: number): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (!next.delete(teamId)) next.add(teamId);
      return next;
    });
  }

  // Average level (0-5) and coverage (%) live on different scales, so each gets
  // its own chart; on a shared axis the level bars flatten to nothing.
  readonly avgLevelChartConfig = computed<ChartConfiguration<'bar'>>(() =>
    this.teamBarChart((t) => t.avg_level, CHART_PRIMARY, 5));

  readonly coverageChartConfig = computed<ChartConfiguration<'bar'>>(() =>
    this.teamBarChart((t) => t.coverage, CHART_SECONDARY, 100, '%'));

  readonly doughnutConfig = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const dist = this.distribution();
    if (!dist) return null;
    const levels = ['1', '2', '3', '4', '5'];
    const values = levels.map((l) => dist.overall[l] ?? 0);
    if (values.every((v) => v === 0)) return null;
    const dark = this.themeService.isDark();
    return {
      type: 'doughnut',
      data: {
        labels: levels.map((l) => `Level ${l}`),
        datasets: [{
          data: values,
          backgroundColor: dark ? LEVEL_COLORS_DARK : LEVEL_COLORS,
          // Transparent gaps instead of Chart.js's white segment borders, which
          // show up as rings on a dark card. The dark level 1 tone sits almost on
          // the card colour, so in dark mode a faint outline keeps its shape.
          borderWidth: dark ? 1 : 0,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, boxHeight: 12, padding: 12, font: { size: 13 } },
          },
        },
      },
    };
  });

  private teamBarChart(
    value: (team: KpiEntry) => number,
    color: string,
    max: number,
    unit = '',
  ): ChartConfiguration<'bar'> {
    const teams = this.data();
    return {
      type: 'bar',
      data: {
        labels: teams.map((t) => t.team_name),
        datasets: [{
          data: teams.map(value),
          backgroundColor: color,
          borderRadius: 4,
          maxBarThickness: 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, max, ticks: { stepSize: max / 5, callback: (v) => `${v}${unit}` } },
        },
      },
    };
  }

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
