import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { RoleTemplateService } from '../../core/role-template.service';
import { RoleTemplate, Skill } from '../../core/skill.models';
import { Team } from '../../core/team.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-role-templates',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    TranslateModule,
  ],
  templateUrl: './admin-role-templates.component.html',
  styleUrl: './admin-role-templates.component.scss',
})
export class AdminRoleTemplatesComponent implements OnInit {
  readonly skills = input<Skill[]>([]);
  readonly teams = input<Team[]>([]);

  private readonly roleTemplateService = inject(RoleTemplateService);
  private readonly toast = inject(ToastService);

  readonly roleTemplates = signal<RoleTemplate[]>([]);

  newTemplateName = '';
  newTemplateDesc = '';
  selectedTemplateId: number | undefined;
  newTplSkill: number | undefined;
  newTplLevel: number | undefined;
  applyTemplateId: number | undefined;
  applyTeamId: number | undefined;

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.roleTemplateService.list().subscribe((t) => this.roleTemplates.set(t));
  }

  addRoleTemplate(): void {
    if (!this.newTemplateName.trim()) return;
    this.roleTemplateService.create(this.newTemplateName.trim(), this.newTemplateDesc.trim()).subscribe({
      next: () => {
        this.newTemplateName = '';
        this.newTemplateDesc = '';
        this.toast.success('TOAST.TEMPLATE_CREATED');
        this.loadTemplates();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.loadTemplates(); },
    });
  }

  deleteRoleTemplate(id: number): void {
    this.roleTemplateService.delete(id).subscribe({
      next: () => { this.toast.success('TOAST.TEMPLATE_DELETED'); this.loadTemplates(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.loadTemplates(); },
    });
  }

  addTemplateSkill(): void {
    if (!this.selectedTemplateId || !this.newTplSkill || !this.newTplLevel) return;
    this.roleTemplateService.addSkill(this.selectedTemplateId, this.newTplSkill, this.newTplLevel).subscribe({
      next: (tpl) => {
        this.roleTemplates.update((list) => list.map((t) => (t.id === tpl.id ? tpl : t)));
        this.newTplSkill = undefined;
        this.newTplLevel = undefined;
      },
      error: () => this.loadTemplates(),
    });
  }

  removeTemplateSkill(templateId: number, skillPk: number): void {
    this.roleTemplateService.removeSkill(templateId, skillPk).subscribe({
      next: (tpl) => this.roleTemplates.update((list) => list.map((t) => (t.id === tpl.id ? tpl : t))),
      error: () => this.loadTemplates(),
    });
  }

  applyTemplate(): void {
    if (!this.applyTemplateId || !this.applyTeamId) return;
    this.roleTemplateService.apply(this.applyTemplateId, this.applyTeamId).subscribe({
      next: () => {
        this.applyTemplateId = undefined;
        this.applyTeamId = undefined;
        this.toast.success('TOAST.TEMPLATE_APPLIED');
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }

  selectedTemplate(): RoleTemplate | undefined {
    return this.roleTemplates().find((t) => t.id === this.selectedTemplateId);
  }
}
