import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { MeService } from '../../core/me.service';
import { SkillAssignmentService } from '../../core/skill-assignment.service';
import { TeamAssignment } from '../../core/skill.models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-team-review',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTableModule, TranslateModule],
  templateUrl: './team-review.component.html',
  styleUrl: './team-review.component.scss',
})
export class TeamReviewComponent implements OnInit {
  private readonly skillService = inject(SkillAssignmentService);
  private readonly meService = inject(MeService);
  private readonly toast = inject(ToastService);

  readonly data = signal<TeamAssignment[]>([]);
  readonly loading = signal(false);
  readonly isTeamLead = signal(false);
  readonly isAdmin = signal(false);
  readonly displayedColumns = ['employee_name', 'skill_name', 'category_name', 'level', 'status', 'actions'];
  readonly skeletonRows = [1, 2, 3, 4];

  // Rows nobody but an admin can act on. A lead's own queue never contains
  // these, so the banner stays out of the way in the normal case.
  readonly unownedCount = computed(
    () => this.data().filter((a) => !a.has_team_lead).length,
  );

  ngOnInit(): void {
    this.loadAssignments();
    this.meService.getProfile().subscribe((me) => {
      this.isTeamLead.set(me.is_team_lead);
      this.isAdmin.set(me.is_admin);
    });
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
