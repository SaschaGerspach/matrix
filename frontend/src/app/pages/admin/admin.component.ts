import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { Skill, SkillCategory, SkillLevelDescription, SkillRequirement, SkillService } from '../../core/skill.service';
import { Team, TeamService } from '../../core/team.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTabsModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly skillService = inject(SkillService);
  private readonly teamService = inject(TeamService);

  readonly categories = signal<SkillCategory[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly requirements = signal<SkillRequirement[]>([]);
  readonly levelDescriptions = signal<SkillLevelDescription[]>([]);

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
    this.skillService.listCategories().subscribe((c) => this.categories.set(c));
    this.skillService.listSkills().subscribe((s) => this.skills.set(s));
    this.teamService.list().subscribe((t) => this.teams.set(t));
    this.skillService.listRequirements().subscribe((r) => this.requirements.set(r));
    this.skillService.listLevelDescriptions().subscribe((d) => this.levelDescriptions.set(d));
  }

  addCategory(): void {
    if (!this.newCategoryName.trim()) return;
    this.skillService.createCategory(this.newCategoryName.trim()).subscribe(() => {
      this.newCategoryName = '';
      this.skillService.listCategories().subscribe((c) => this.categories.set(c));
    });
  }

  deleteCategory(id: number): void {
    this.skillService.deleteCategory(id).subscribe(() => {
      this.skillService.listCategories().subscribe((c) => this.categories.set(c));
    });
  }

  addSkill(): void {
    if (!this.newSkillName.trim() || !this.newSkillCategory) return;
    this.skillService.createSkill(this.newSkillName.trim(), this.newSkillCategory).subscribe(() => {
      this.newSkillName = '';
      this.newSkillCategory = undefined;
      this.skillService.listSkills().subscribe((s) => this.skills.set(s));
    });
  }

  deleteSkill(id: number): void {
    this.skillService.deleteSkill(id).subscribe(() => {
      this.skillService.listSkills().subscribe((s) => this.skills.set(s));
    });
  }

  getCategoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? '';
  }

  addRequirement(): void {
    if (!this.newReqTeam || !this.newReqSkill || !this.newReqLevel) return;
    this.skillService.createRequirement(this.newReqTeam, this.newReqSkill, this.newReqLevel).subscribe(() => {
      this.newReqTeam = undefined;
      this.newReqSkill = undefined;
      this.newReqLevel = undefined;
      this.skillService.listRequirements().subscribe((r) => this.requirements.set(r));
    });
  }

  deleteRequirement(id: number): void {
    this.skillService.deleteRequirement(id).subscribe(() => {
      this.skillService.listRequirements().subscribe((r) => this.requirements.set(r));
    });
  }

  getSkillName(id: number): string {
    return this.skills().find((s) => s.id === id)?.name ?? '';
  }

  addLevelDescription(): void {
    if (!this.newDescSkill || !this.newDescLevel || !this.newDescText.trim()) return;
    this.skillService.createLevelDescription(this.newDescSkill, this.newDescLevel, this.newDescText.trim()).subscribe(() => {
      this.newDescSkill = undefined;
      this.newDescLevel = undefined;
      this.newDescText = '';
      this.skillService.listLevelDescriptions().subscribe((d) => this.levelDescriptions.set(d));
    });
  }

  deleteLevelDescription(id: number): void {
    this.skillService.deleteLevelDescription(id).subscribe(() => {
      this.skillService.listLevelDescriptions().subscribe((d) => this.levelDescriptions.set(d));
    });
  }
}
