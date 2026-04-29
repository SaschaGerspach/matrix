import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { DevelopmentPlan, DevelopmentPlanService } from '../../core/development-plan.service';
import { Skill } from '../../core/skill.models';

@Component({
  selector: 'app-profile-dev-plans',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    TranslateModule,
  ],
  templateUrl: './profile-dev-plans.component.html',
  styleUrl: './profile-dev-plans.component.scss',
})
export class ProfileDevPlansComponent implements OnInit {
  readonly employeeId = input.required<number>();
  readonly canEdit = input(false);
  readonly skills = input<Skill[]>([]);

  private readonly devPlanService = inject(DevelopmentPlanService);

  readonly devPlans = signal<DevelopmentPlan[]>([]);
  readonly showForm = signal(false);

  newPlanTitle = '';
  newPlanNotes = '';
  newGoalPlan: number | undefined;
  newGoalSkill: number | undefined;
  newGoalCurrentLevel: number | undefined;
  newGoalTargetLevel: number | undefined;
  newGoalTargetDate = '';

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.devPlanService.listPlans(this.employeeId()).subscribe({
      next: (res) => this.devPlans.set(res.results),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  createPlan(): void {
    if (!this.newPlanTitle.trim()) return;
    this.devPlanService.createPlan(this.employeeId(), this.newPlanTitle.trim(), this.newPlanNotes.trim()).subscribe({
      next: () => {
        this.newPlanTitle = '';
        this.newPlanNotes = '';
        this.showForm.set(false);
        this.loadPlans();
      },
      error: () => this.loadPlans(),
    });
  }

  deletePlan(id: number): void {
    this.devPlanService.deletePlan(id).subscribe({
      next: () => this.loadPlans(),
      error: () => this.loadPlans(),
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
        this.loadPlans();
      },
      error: () => this.loadPlans(),
    });
  }

  updateGoalStatus(goalId: number, status: string): void {
    this.devPlanService.updateGoal(goalId, { status: status as 'open' | 'in_progress' | 'completed' }).subscribe({
      next: () => this.loadPlans(),
      error: () => this.loadPlans(),
    });
  }

  deleteGoal(goalId: number): void {
    this.devPlanService.deleteGoal(goalId).subscribe({
      next: () => this.loadPlans(),
      error: () => this.loadPlans(),
    });
  }
}
