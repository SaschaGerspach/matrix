import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslateModule } from '@ngx-translate/core';

import { AuditLogEntry, AuditService } from '../../core/audit.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { Skill, SkillCategory, SkillLevelDescription, SkillRequirement } from '../../core/skill.models';
import { Team, TeamPerson, TeamService } from '../../core/team.service';
import { ToastService } from '../../core/toast.service';

import { AdminImportComponent } from './admin-import.component';
import { AdminRoleTemplatesComponent } from './admin-role-templates.component';

const ACCENT_SLOTS = 6;

// Derived from the id so a group keeps its colour when categories are renamed,
// reordered or filtered away.
function accentSlot(id: number): number {
  return (id % ACCENT_SLOTS) + 1;
}

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
    MatTooltipModule,
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

  // A team with members but no lead silently strands their self-assessments:
  // the team review only ever lists members of teams you lead.
  readonly teamsWithoutLead = computed(
    () => this.teams().filter((t) => t.team_leads.length === 0 && t.members.length > 0),
  );

  readonly teamNamesWithoutLead = computed(
    () => this.teamsWithoutLead().map((t) => t.name).join(', '),
  );

  // Leads are picked from the team's own members, which is both the normal case
  // and the only list of names available without paging the employee endpoint.
  assignableMembers(team: Team): TeamPerson[] {
    return team.member_details.filter(
      (member) => !team.team_leads.includes(member.id),
    );
  }

  addLead(team: Team, employeeId: number): void {
    this.saveLeads(team, [...team.team_leads, employeeId]);
  }

  removeLead(team: Team, employeeId: number): void {
    this.saveLeads(team, team.team_leads.filter((id) => id !== employeeId));
  }

  private saveLeads(team: Team, leadIds: number[]): void {
    this.teamService.setLeads(team.id, leadIds).subscribe({
      next: (updated) => {
        this.teams.update((list) => list.map((t) => (t.id === team.id ? updated : t)));
        this.toast.success('TOAST.TEAM_LEADS_UPDATED');
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }
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

  editingSkill: { id: number; name: string; category: number } | null = null;
  showAddForm = false;
  showAddReqForm = false;

  readonly searchTerm = signal('');
  readonly reqSearchTerm = signal('');

  readonly groupedSkills = computed(() => {
    const cats = this.categories();
    let skills = this.skills();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      skills = skills.filter((s) => s.name.toLowerCase().includes(term));
    }
    return cats
      .map((cat) => ({
        category: cat,
        accent: accentSlot(cat.id),
        skills: skills.filter((s) => s.category === cat.id),
      }))
      .filter((g) => g.skills.length > 0)
      .sort((a, b) => a.category.name.localeCompare(b.category.name));
  });

  readonly groupedRequirements = computed(() => {
    const teams = this.teams();
    let reqs = this.requirements();
    const term = this.reqSearchTerm().toLowerCase();
    if (term) {
      reqs = reqs.filter((r) => r.skill_name.toLowerCase().includes(term));
    }
    return teams
      .map((team) => ({
        team,
        accent: accentSlot(team.id),
        requirements: reqs.filter((r) => r.team === team.id),
      }))
      .filter((g) => g.requirements.length > 0)
      .sort((a, b) => a.team.name.localeCompare(b.team.name));
  });

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

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  onReqSearchInput(value: string): void {
    this.reqSearchTerm.set(value);
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
        this.showAddForm = false;
        this.toast.success('TOAST.SKILL_CREATED');
        this.reloadSkills();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(this.isDuplicateName(err) ? 'TOAST.SKILL_DUPLICATE' : 'TOAST.ERROR');
        this.reloadSkills();
      },
    });
  }

  // A name clash is not worth retrying, so it must not read like a transient
  // failure. The API reports it as a 400 with a name field error.
  private isDuplicateName(err: HttpErrorResponse): boolean {
    return err.status === 400 && !!err.error?.name;
  }

  deleteSkill(id: number): void {
    this.catalogService.deleteSkill(id).subscribe({
      next: () => {
        this.toast.success('TOAST.SKILL_DELETED');
        this.reloadSkills();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.reloadSkills(); },
    });
  }

  startEditSkill(skill: Skill): void {
    this.editingSkill = { id: skill.id, name: skill.name, category: skill.category };
  }

  cancelEditSkill(): void {
    this.editingSkill = null;
  }

  saveSkill(): void {
    if (!this.editingSkill || !this.editingSkill.name.trim()) return;
    this.catalogService.updateSkill(this.editingSkill.id, {
      name: this.editingSkill.name.trim(),
      category: this.editingSkill.category,
    }).subscribe({
      next: () => {
        this.editingSkill = null;
        this.toast.success('TOAST.SKILL_UPDATED');
        this.reloadSkills();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(this.isDuplicateName(err) ? 'TOAST.SKILL_DUPLICATE' : 'TOAST.ERROR');
      },
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
        this.showAddReqForm = false;
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
