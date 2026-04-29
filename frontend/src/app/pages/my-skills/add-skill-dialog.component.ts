import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TranslateModule } from '@ngx-translate/core';

import { Skill, SkillService } from '../../core/skill.service';
import { ToastService } from '../../core/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-skill-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './add-skill-dialog.component.html',
})
export class AddSkillDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly skillService = inject(SkillService);
  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(MatDialogRef<AddSkillDialogComponent>);
  private readonly toast = inject(ToastService);

  readonly skills = signal<Skill[]>([]);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    skill: [null as number | null, Validators.required],
    level: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  ngOnInit(): void {
    this.skillService.listSkills().subscribe({
      next: (list) => this.skills.set(list),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const { skill, level } = this.form.getRawValue();

    this.http.get<{ id: number }>(`${environment.apiUrl}/me/`).subscribe({
      next: (me) => {
        this.skillService.createAssignment(skill!, level!, me.id).subscribe({
          next: () => { this.toast.success('TOAST.SKILL_ADDED'); this.dialogRef.close(true); },
          error: (err) => {
            const msg = err.error?.employee?.[0] || err.error?.skill?.[0] || 'Failed to add skill.';
            this.error.set(msg);
          },
        });
      },
      error: () => this.error.set('Could not determine your employee profile.'),
    });
  }
}
