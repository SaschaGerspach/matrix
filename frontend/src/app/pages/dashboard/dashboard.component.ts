import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { SkillAssignmentService } from '../../core/skill-assignment.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { MatrixAssignment, MatrixEmployee, MatrixSkill, SkillCategory } from '../../core/skill.models';
import { MeService } from '../../core/me.service';
import { Team, TeamService } from '../../core/team.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ScrollingModule,
    TranslateModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly catalogService = inject(SkillCatalogService);
  private readonly analyticsService = inject(SkillAnalyticsService);
  private readonly assignmentService = inject(SkillAssignmentService);
  private readonly meService = inject(MeService);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly employees = signal<MatrixEmployee[]>([]);
  readonly skills = signal<MatrixSkill[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly categories = signal<SkillCategory[]>([]);
  readonly loading = signal(false);
  readonly canEdit = signal(false);
  heatmapMode = false;

  readonly levels = [1, 2, 3, 4, 5];
  editingCell: { employeeId: number; skillId: number } | null = null;

  selectedTeam: number | undefined;
  selectedCategory: number | undefined;
  searchTerm = '';

  private assignmentMap = new Map<string, MatrixAssignment>();
  private descriptionMap = new Map<string, string>();

  readonly gridColumns = computed(() => {
    const skillCount = this.skills().length;
    return `180px repeat(${skillCount}, minmax(80px, 1fr))`;
  });

  ngOnInit(): void {
    this.meService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.canEdit.set(p.is_team_lead || p.is_admin);
    });
    this.teamService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((t) => this.teams.set(t));
    this.catalogService.listCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((c) => this.categories.set(c));
    this.catalogService.listSkills().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((skills) => {
      for (const skill of skills) {
        for (const desc of skill.level_descriptions ?? []) {
          this.descriptionMap.set(`${skill.id}_${desc.level}`, desc.description);
        }
      }
    });
    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loading.set(true);
    this.analyticsService.skillMatrix({
      team: this.selectedTeam,
      category: this.selectedCategory,
      search: this.searchTerm || undefined,
    }).subscribe({
      next: (data) => {
        this.employees.set(data.employees);
        this.skills.set(data.skills);
        this.assignmentMap.clear();
        for (const a of data.assignments) {
          this.assignmentMap.set(`${a.employee}_${a.skill}`, a);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.loadMatrix();
  }

  clearFilters(): void {
    this.selectedTeam = undefined;
    this.selectedCategory = undefined;
    this.searchTerm = '';
    this.loadMatrix();
  }

  getLevel(employeeId: number, skillId: number): number | null {
    const a = this.assignmentMap.get(`${employeeId}_${skillId}`);
    return a ? a.level : null;
  }

  getLevelTooltip(skillId: number, level: number | null): string {
    if (!level) return '';
    return this.descriptionMap.get(`${skillId}_${level}`) ?? '';
  }

  startEdit(employeeId: number, skillId: number): void {
    if (this.canEdit()) {
      this.editingCell = { employeeId, skillId };
    }
  }

  cancelEdit(): void {
    this.editingCell = null;
  }

  isEditing(employeeId: number, skillId: number): boolean {
    return this.editingCell?.employeeId === employeeId && this.editingCell?.skillId === skillId;
  }

  setLevel(employeeId: number, skillId: number, level: number): void {
    this.editingCell = null;
    const key = `${employeeId}_${skillId}`;
    const existing = this.assignmentMap.get(key);
    const currentLevel = existing?.level ?? 0;

    if (level === currentLevel) return;

    if (existing && level > 0) {
      const prev = { ...existing };
      this.assignmentMap.set(key, { ...existing, level });
      this.assignmentService.updateAssignment(existing.id, level).subscribe({
        error: () => this.assignmentMap.set(key, prev),
      });
    } else if (!existing && level > 0) {
      const temp: MatrixAssignment = { id: 0, employee: employeeId, skill: skillId, level, status: 'pending' };
      this.assignmentMap.set(key, temp);
      this.assignmentService.createAssignment(skillId, level, employeeId).subscribe({
        next: (result) => this.assignmentMap.set(key, { ...temp, id: result.id }),
        error: () => this.assignmentMap.delete(key),
      });
    }
  }

  openProfile(employeeId: number): void {
    this.router.navigate(['/employees', employeeId]);
  }

  exportCsv(): void {
    this.analyticsService.exportMatrixCsv().subscribe({
      next: (blob) => this.downloadBlob(blob, 'skill-matrix.csv'),
      error: () => {},
    });
  }

  exportPdf(): void {
    this.analyticsService.exportMatrixPdf().subscribe({
      next: (blob) => this.downloadBlob(blob, 'skill-matrix.pdf'),
      error: () => {},
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
