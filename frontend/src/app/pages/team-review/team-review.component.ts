import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAssignmentService } from '../../core/skill-assignment.service';
import { TeamAssignment } from '../../core/skill.models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-team-review',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTableModule, TranslateModule],
  templateUrl: './team-review.component.html',
})
export class TeamReviewComponent implements OnInit {
  private readonly skillService = inject(SkillAssignmentService);
  private readonly toast = inject(ToastService);

  readonly data = signal<TeamAssignment[]>([]);
  readonly loading = signal(false);
  readonly displayedColumns = ['employee_name', 'skill_name', 'category_name', 'level', 'status', 'actions'];
  readonly skeletonRows = [1, 2, 3, 4];

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.skillService.teamAssignments('pending').subscribe({
      next: (list) => {
        this.data.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirm(id: number): void {
    this.skillService.confirmAssignment(id).subscribe({
      next: () => {
        this.toast.success('TOAST.SKILL_CONFIRMED');
        this.loadAssignments();
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }
}
