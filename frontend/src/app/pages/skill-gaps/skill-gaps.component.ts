import { Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { SkillGap } from '../../core/skill.models';

@Component({
  selector: 'app-skill-gaps',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTableModule, TranslateModule],
  templateUrl: './skill-gaps.component.html',
  styleUrl: './skill-gaps.component.scss',
})
export class SkillGapsComponent implements OnInit {
  private readonly skillService = inject(SkillAnalyticsService);

  readonly data = signal<SkillGap[]>([]);
  readonly loading = signal(false);
  readonly displayedColumns = ['employee_name', 'team_name', 'skill_name', 'category_name', 'required_level', 'actual_level', 'gap'];

  ngOnInit(): void {
    this.loadGaps();
  }

  loadGaps(): void {
    this.loading.set(true);
    this.skillService.skillGaps().subscribe({
      next: (list) => {
        this.data.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
