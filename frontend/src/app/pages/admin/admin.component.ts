import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { TranslateModule } from '@ngx-translate/core';

import { AuditLogEntry, AuditService } from '../../core/audit.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { Skill, SkillCategory, SkillLevelDescription, SkillRequirement } from '../../core/skill.models';
import { Team, TeamService } from '../../core/team.service';
import { ToastService } from '../../core/toast.service';

import { AdminImportComponent } from './admin-import.component';
import { AdminRoleTemplatesComponent } from './admin-role-templates.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
    TranslateModule,
    AdminImportComponent,
    AdminRoleTemplatesComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly catalogService = inject(SkillCatalogService);
  private readonly teamService = inject(TeamService);
  private readonly auditService = inject(AuditService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = signal<SkillCategory[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly requirements = signal<SkillRequirement[]>([]);
  readonly levelDescriptions = signal<SkillLevelDescription[]>([]);
  readonly auditLog = signal<AuditLogEntry[]>([]);

  newCategoryName = '';
  newSkillName = '';
  newSkillCategory: number | undefined;
  newReqTeam: number | undefined;
  newReqSkill: number | undefined;
  newReqLevel: number | undefined;
  newDescSkill: number | undefined;
  newDescLevel: number | undefined;
  newDescText = '';

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.catalogService.listCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((c) => this.categories.set(c));
    this.catalogService.listSkills().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => this.skills.set(s));
    this.teamService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((t) => this.teams.set(t));
    this.catalogService.listRequirements().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => this.requirements.set(r));
    this.catalogService.listLevelDescriptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => this.levelDescriptions.set(d));
    this.auditService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => this.auditLog.set(res.results));
  }

  addCategory(): void {
    if (!this.newCategoryName.trim()) return;
    this.catalogService.createCategory(this.newCategoryName.trim()).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.toast.success('TOAST.CATEGORY_CREATED');
        this.reloadCategories();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadCategories(); },
    });
  }

  deleteCategory(id: number): void {
    this.catalogService.deleteCategory(id).subscribe({
      next: () => { this.toast.success('TOAST.CATEGORY_DELETED'); this.reloadCategories(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadCategories(); },
    });
  }

  addSkill(): void {
    if (!this.newSkillName.trim() || !this.newSkillCategory) return;
    this.catalogService.createSkill(this.newSkillName.trim(), this.newSkillCategory).subscribe({
      next: () => {
        this.newSkillName = '';
        this.newSkillCategory = undefined;
        this.toast.success('TOAST.SKILL_CREATED');
        this.reloadSkills();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadSkills(); },
    });
  }

  deleteSkill(id: number): void {
    this.catalogService.deleteSkill(id).subscribe({
      next: () => { this.toast.success('TOAST.SKILL_DELETED'); this.reloadSkills(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadSkills(); },
    });
  }

  getCategoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? '';
  }

  addRequirement(): void {
    if (!this.newReqTeam || !this.newReqSkill || !this.newReqLevel) return;
    this.catalogService.createRequirement(this.newReqTeam, this.newReqSkill, this.newReqLevel).subscribe({
      next: () => {
        this.newReqTeam = undefined;
        this.newReqSkill = undefined;
        this.newReqLevel = undefined;
        this.toast.success('TOAST.REQUIREMENT_CREATED');
        this.reloadRequirements();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadRequirements(); },
    });
  }

  deleteRequirement(id: number): void {
    this.catalogService.deleteRequirement(id).subscribe({
      next: () => { this.toast.success('TOAST.REQUIREMENT_DELETED'); this.reloadRequirements(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadRequirements(); },
    });
  }

  getSkillName(id: number): string {
    return this.skills().find((s) => s.id === id)?.name ?? '';
  }

  addLevelDescription(): void {
    if (!this.newDescSkill || !this.newDescLevel || !this.newDescText.trim()) return;
    this.catalogService.createLevelDescription(this.newDescSkill, this.newDescLevel, this.newDescText.trim()).subscribe({
      next: () => {
        this.newDescSkill = undefined;
        this.newDescLevel = undefined;
        this.newDescText = '';
        this.toast.success('TOAST.LEVEL_DESC_CREATED');
        this.reloadLevelDescriptions();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadLevelDescriptions(); },
    });
  }

  deleteLevelDescription(id: number): void {
    this.catalogService.deleteLevelDescription(id).subscribe({
      next: () => { this.toast.success('TOAST.LEVEL_DESC_DELETED'); this.reloadLevelDescriptions(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadLevelDescriptions(); },
    });
  }

  private reloadCategories(): void {
    this.catalogService.listCategories().subscribe((c) => this.categories.set(c));
  }

  private reloadSkills(): void {
    this.catalogService.listSkills().subscribe((s) => this.skills.set(s));
  }

  private reloadRequirements(): void {
    this.catalogService.listRequirements().subscribe((r) => this.requirements.set(r));
  }

  private reloadLevelDescriptions(): void {
    this.catalogService.listLevelDescriptions().subscribe((d) => this.levelDescriptions.set(d));
  }
}
