import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { environment } from '../../../environments/environment';
import { MatrixAssignment, MatrixEmployee, MatrixSkill, SkillService } from '../../core/skill.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatTableModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly skillService = inject(SkillService);

  readonly employees = signal<MatrixEmployee[]>([]);
  readonly skills = signal<MatrixSkill[]>([]);
  readonly loading = signal(false);

  private assignmentMap = new Map<string, MatrixAssignment>();

  readonly displayedColumns = computed(() => {
    return ['employee', ...this.skills().map((s) => `skill_${s.id}`)];
  });

  ngOnInit(): void {
    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loading.set(true);
    this.skillService.skillMatrix().subscribe({
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

  getLevel(employeeId: number, skillId: number): number | null {
    const a = this.assignmentMap.get(`${employeeId}_${skillId}`);
    return a ? a.level : null;
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
