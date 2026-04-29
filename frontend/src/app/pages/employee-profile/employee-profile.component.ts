import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { EmployeeProfile, EmployeeService } from '../../core/employee.service';
import { MeService } from '../../core/me.service';
import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { Skill, SkillHistoryEntry, SkillTrendData } from '../../core/skill.models';
import { ProfileCertificatesComponent } from './profile-certificates.component';
import { ProfileDevPlansComponent } from './profile-dev-plans.component';

const TREND_COLORS = [
  '#3f51b5', '#e91e63', '#4caf50', '#ff9800', '#9c27b0',
  '#00bcd4', '#795548', '#607d8b', '#f44336', '#009688',
];

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    BaseChartDirective,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    ProfileCertificatesComponent,
    ProfileDevPlansComponent,
    RouterLink,
    TranslateModule,
  ],
  templateUrl: './employee-profile.component.html',
  styleUrl: './employee-profile.component.scss',
})
export class EmployeeProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly employeeService = inject(EmployeeService);
  private readonly catalogService = inject(SkillCatalogService);
  private readonly analyticsService = inject(SkillAnalyticsService);
  private readonly meService = inject(MeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<EmployeeProfile | null>(null);
  readonly history = signal<SkillHistoryEntry[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly hasTrends = signal(false);
  readonly loading = signal(true);
  readonly canEdit = signal(false);
  readonly displayedColumns = ['skill_name', 'category_name', 'level', 'status'];
  readonly historyColumns = ['timestamp', 'skill_name', 'action', 'old_level', 'new_level', 'changed_by_name'];

  employeeId = 0;

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

  trendData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  trendOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      y: { min: 0, max: 5, ticks: { stepSize: 1 } },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };

  ngOnInit(): void {
    this.employeeId = Number(this.route.snapshot.paramMap.get('id'));
    this.employeeService.getProfile(this.employeeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.buildRadarData(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.analyticsService.skillHistory(this.employeeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.history.set(res.results),
    });
    this.analyticsService.skillTrends(this.employeeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.buildTrendData(data),
    });
    this.catalogService.listSkills().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => this.skills.set(s));
    this.meService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((me) => {
      this.canEdit.set(me.is_admin || me.is_team_lead || me.id === this.employeeId);
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

  private buildTrendData(trends: SkillTrendData[]): void {
    if (!trends.length) return;

    const allDates = new Set<string>();
    for (const trend of trends) {
      for (const p of trend.points) {
        allDates.add(p.date.split('T')[0]);
      }
    }
    const sortedDates = [...allDates].sort();

    this.trendData = {
      labels: sortedDates,
      datasets: trends.map((t, i) => {
        const dateLevel = new Map(t.points.map((p) => [p.date.split('T')[0], p.level]));
        const data: (number | null)[] = [];
        let lastLevel: number | null = null;
        for (const d of sortedDates) {
          if (dateLevel.has(d)) lastLevel = dateLevel.get(d)!;
          data.push(lastLevel);
        }
        return {
          label: t.skill_name,
          data,
          borderColor: TREND_COLORS[i % TREND_COLORS.length],
          fill: false,
          tension: 0.3,
        };
      }),
    };
    this.hasTrends.set(true);
  }
}
