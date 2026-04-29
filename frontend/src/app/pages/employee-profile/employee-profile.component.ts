import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TranslateModule } from '@ngx-translate/core';

import { Certificate, CertificateService } from '../../core/certificate.service';
import { DevelopmentPlan, DevelopmentPlanService } from '../../core/development-plan.service';
import { EmployeeProfile, EmployeeService } from '../../core/employee.service';
import { MeService } from '../../core/me.service';
import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { Skill, SkillHistoryEntry, SkillTrendData } from '../../core/skill.models';

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
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
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
  private readonly certificateService = inject(CertificateService);
  private readonly devPlanService = inject(DevelopmentPlanService);
  private readonly meService = inject(MeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<EmployeeProfile | null>(null);
  readonly history = signal<SkillHistoryEntry[]>([]);
  readonly certificates = signal<Certificate[]>([]);
  readonly devPlans = signal<DevelopmentPlan[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly hasTrends = signal(false);
  readonly loading = signal(true);
  readonly canEdit = signal(false);
  readonly showCertForm = signal(false);
  readonly showPlanForm = signal(false);
  readonly displayedColumns = ['skill_name', 'category_name', 'level', 'status'];
  readonly historyColumns = ['timestamp', 'skill_name', 'action', 'old_level', 'new_level', 'changed_by_name'];
  readonly certColumns = ['name', 'skill_name', 'issuer', 'expiry_date', 'file', 'actions'];

  private employeeId = 0;
  certName = '';
  certIssuer = '';
  certIssuedDate = '';
  certExpiryDate = '';
  certSkill: number | undefined;
  certFile: File | null = null;
  certFileError = '';

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  newPlanTitle = '';
  newPlanNotes = '';
  newGoalPlan: number | undefined;
  newGoalSkill: number | undefined;
  newGoalCurrentLevel: number | undefined;
  newGoalTargetLevel: number | undefined;
  newGoalTargetDate = '';

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
    this.loadCertificates();
    this.loadDevPlans();
    this.catalogService.listSkills().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => this.skills.set(s));
    this.meService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((me) => {
      this.canEdit.set(me.is_admin || me.is_team_lead || me.id === this.employeeId);
    });
  }

  loadCertificates(): void {
    this.certificateService.list(this.employeeId).subscribe({
      next: (res) => this.certificates.set(res.results),
    });
  }

  toggleCertForm(): void {
    this.showCertForm.update((v) => !v);
  }

  onCertFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.certFileError = '';
    if (file) {
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        this.certFileError = 'CERTIFICATES.INVALID_FILE_TYPE';
        this.certFile = null;
        return;
      }
      if (file.size > this.MAX_FILE_SIZE) {
        this.certFileError = 'CERTIFICATES.FILE_TOO_LARGE';
        this.certFile = null;
        return;
      }
    }
    this.certFile = file;
  }

  saveCertificate(): void {
    if (!this.certName.trim()) return;
    const formData = new FormData();
    formData.append('employee', String(this.employeeId));
    formData.append('name', this.certName.trim());
    if (this.certIssuer.trim()) formData.append('issuer', this.certIssuer.trim());
    if (this.certIssuedDate) formData.append('issued_date', this.certIssuedDate);
    if (this.certExpiryDate) formData.append('expiry_date', this.certExpiryDate);
    if (this.certSkill) formData.append('skill', String(this.certSkill));
    if (this.certFile) formData.append('file', this.certFile);
    this.certificateService.create(formData).subscribe({
      next: () => {
        this.resetCertForm();
        this.loadCertificates();
      },
      error: () => this.loadCertificates(),
    });
  }

  deleteCertificate(id: number): void {
    this.certificateService.delete(id).subscribe({
      next: () => this.loadCertificates(),
      error: () => this.loadCertificates(),
    });
  }

  isExpired(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const inThreeMonths = new Date();
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
    return expiry >= now && expiry <= inThreeMonths;
  }

  loadDevPlans(): void {
    this.devPlanService.listPlans(this.employeeId).subscribe({
      next: (res) => this.devPlans.set(res.results),
    });
  }

  togglePlanForm(): void {
    this.showPlanForm.update((v) => !v);
  }

  createPlan(): void {
    if (!this.newPlanTitle.trim()) return;
    this.devPlanService.createPlan(this.employeeId, this.newPlanTitle.trim(), this.newPlanNotes.trim()).subscribe({
      next: () => {
        this.newPlanTitle = '';
        this.newPlanNotes = '';
        this.showPlanForm.set(false);
        this.loadDevPlans();
      },
      error: () => this.loadDevPlans(),
    });
  }

  deletePlan(id: number): void {
    this.devPlanService.deletePlan(id).subscribe({
      next: () => this.loadDevPlans(),
      error: () => this.loadDevPlans(),
    });
  }

  addGoal(): void {
    if (!this.newGoalPlan || !this.newGoalSkill || !this.newGoalCurrentLevel || !this.newGoalTargetLevel) return;
    this.devPlanService.createGoal({
      plan: this.newGoalPlan,
      skill: this.newGoalSkill,
      current_level: this.newGoalCurrentLevel,
      target_level: this.newGoalTargetLevel,
      target_date: this.newGoalTargetDate || undefined,
    }).subscribe({
      next: () => {
        this.newGoalSkill = undefined;
        this.newGoalCurrentLevel = undefined;
        this.newGoalTargetLevel = undefined;
        this.newGoalTargetDate = '';
        this.loadDevPlans();
      },
      error: () => this.loadDevPlans(),
    });
  }

  updateGoalStatus(goalId: number, status: string): void {
    this.devPlanService.updateGoal(goalId, { status: status as 'open' | 'in_progress' | 'completed' }).subscribe({
      next: () => this.loadDevPlans(),
      error: () => this.loadDevPlans(),
    });
  }

  deleteGoal(goalId: number): void {
    this.devPlanService.deleteGoal(goalId).subscribe({
      next: () => this.loadDevPlans(),
      error: () => this.loadDevPlans(),
    });
  }

  goalProgress(goal: { current_level: number; target_level: number; status?: string }): number {
    if (goal.status === 'completed') return 100;
    const range = goal.target_level - goal.current_level;
    if (range <= 0) return 100;
    return 0;
  }

  private resetCertForm(): void {
    this.certName = '';
    this.certIssuer = '';
    this.certIssuedDate = '';
    this.certExpiryDate = '';
    this.certSkill = undefined;
    this.certFile = null;
    this.showCertForm.set(false);
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
