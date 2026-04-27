import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { MySkillAssignment, SkillService } from '../../core/skill.service';
import { AddSkillDialogComponent } from './add-skill-dialog.component';

@Component({
  selector: 'app-my-skills',
  standalone: true,
  imports: [MatButtonModule, MatChipsModule, MatProgressSpinnerModule, MatTableModule],
  templateUrl: './my-skills.component.html',
  styleUrl: './my-skills.component.scss',
})
export class MySkillsComponent implements OnInit {
  private readonly skillService = inject(SkillService);
  private readonly dialog = inject(MatDialog);

  readonly data = signal<MySkillAssignment[]>([]);
  readonly loading = signal(false);
  readonly displayedColumns = ['skill_name', 'category_name', 'level', 'status'];

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading.set(true);
    this.skillService.mySkills().subscribe({
      next: (list) => {
        this.data.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddSkillDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSkills();
      }
    });
  }
}
