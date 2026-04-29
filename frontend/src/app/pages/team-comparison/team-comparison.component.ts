import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { TeamComparisonEntry } from '../../core/skill.models';
import { Team, TeamService } from '../../core/team.service';

const COLORS = [
  'rgba(63, 81, 181, 0.7)',
  'rgba(233, 30, 99, 0.7)',
  'rgba(76, 175, 80, 0.7)',
  'rgba(255, 152, 0, 0.7)',
  'rgba(156, 39, 176, 0.7)',
  'rgba(0, 188, 212, 0.7)',
];

const BORDER_COLORS = [
  'rgb(63, 81, 181)',
  'rgb(233, 30, 99)',
  'rgb(76, 175, 80)',
  'rgb(255, 152, 0)',
  'rgb(156, 39, 176)',
  'rgb(0, 188, 212)',
];

@Component({
  selector: 'app-team-comparison',
  standalone: true,
  imports: [
    BaseChartDirective,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './team-comparison.component.html',
  styleUrl: './team-comparison.component.scss',
})
export class TeamComparisonComponent implements OnInit {
  private readonly skillService = inject(SkillAnalyticsService);
  private readonly teamService = inject(TeamService);

  readonly teams = signal<Team[]>([]);
  readonly loading = signal(false);
  readonly hasData = signal(false);

  selectedTeamIds: number[] = [];
  chartMode: 'bar' | 'radar' = 'bar';

  barData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: { min: 0, max: 5, ticks: { stepSize: 1 } },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };

  radarData: ChartConfiguration<'radar'>['data'] = { labels: [], datasets: [] };
  radarOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    scales: {
      r: { min: 0, max: 5, ticks: { stepSize: 1 } },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };

  ngOnInit(): void {
    this.teamService.list().subscribe((t) => this.teams.set(t));
  }

  compare(): void {
    if (this.selectedTeamIds.length < 2) return;
    this.loading.set(true);
    this.skillService.teamComparison(this.selectedTeamIds).subscribe({
      next: (data) => {
        this.buildChart(data);
        this.loading.set(false);
        this.hasData.set(true);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildChart(data: TeamComparisonEntry[]): void {
    const filtered = data.filter((d) => Object.values(d.teams).some((v) => v && v > 0));
    const labels = filtered.map((d) => d.skill_name);
    const teamNames = Object.keys(filtered[0]?.teams ?? {});

    this.barData = {
      labels,
      datasets: teamNames.map((name, i) => ({
        label: name,
        data: filtered.map((d) => d.teams[name] ?? 0),
        backgroundColor: COLORS[i % COLORS.length],
      })),
    };

    this.radarData = {
      labels,
      datasets: teamNames.map((name, i) => ({
        label: name,
        data: filtered.map((d) => d.teams[name] ?? 0),
        backgroundColor: COLORS[i % COLORS.length],
        borderColor: BORDER_COLORS[i % BORDER_COLORS.length],
        borderWidth: 2,
        pointBackgroundColor: BORDER_COLORS[i % BORDER_COLORS.length],
      })),
    };
  }
}
