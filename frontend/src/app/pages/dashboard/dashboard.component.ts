import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { MatrixAssignment, MatrixEmployee, MatrixSkill, SkillCategory, SkillService } from '../../core/skill.service';
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
    MatTableModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly skillService = inject(SkillService);
  private readonly meService = inject(MeService);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);

  readonly employees = signal<MatrixEmployee[]>([]);
  readonly skills = signal<MatrixSkill[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly categories = signal<SkillCategory[]>([]);
  readonly loading = signal(false);
  readonly canEdit = signal(false);

  readonly levels = [1, 2, 3, 4, 5];
  editingCell: { employeeId: number; skillId: number } | null = null;

  selectedTeam: number | undefined;
  selectedCategory: number | undefined;
  searchTerm = '';

  private assignmentMap = new Map<string, MatrixAssignment>();

  readonly displayedColumns = computed(() => {
    return ['employee', ...this.skills().map((s) => `skill_${s.id}`)];
  });

  ngOnInit(): void {
    this.meService.getProfile().subscribe((p) => {
      this.canEdit.set(p.is_team_lead || p.is_admin);
    });
    this.teamService.list().subscribe((t) => this.teams.set(t));
    this.skillService.listCategories().subscribe((c) => this.categories.set(c));
    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loading.set(true);
    this.skillService.skillMatrix({
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
      this.skillService.updateAssignment(existing.id, level).subscribe({
        error: () => this.assignmentMap.set(key, prev),
      });
    } else if (!existing && level > 0) {
      const temp: MatrixAssignment = { id: 0, employee: employeeId, skill: skillId, level, status: 'pending' };
      this.assignmentMap.set(key, temp);
      this.skillService.createAssignment(skillId, level, employeeId).subscribe({
        next: (result) => this.assignmentMap.set(key, { ...temp, id: result.id }),
        error: () => this.assignmentMap.delete(key),
      });
    }
  }

  openProfile(employeeId: number): void {
    this.router.navigate(['/employees', employeeId]);
  }

  exportCsv(): void {
    this.http
      .get(`${environment.apiUrl}/skill-matrix/export/`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'skill-matrix.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }
}
