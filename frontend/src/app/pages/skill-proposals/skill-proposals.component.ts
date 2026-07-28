import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslateModule } from '@ngx-translate/core';

import { MeService } from '../../core/me.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { Skill, SkillCategory } from '../../core/skill.models';
import { SkillProposal, SkillProposalService } from '../../core/skill-proposal.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-skill-proposals',
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
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './skill-proposals.component.html',
  styleUrl: './skill-proposals.component.scss',
})
export class SkillProposalsComponent implements OnInit {
  private readonly proposalService = inject(SkillProposalService);
  private readonly skillService = inject(SkillCatalogService);
  private readonly meService = inject(MeService);
  private readonly toast = inject(ToastService);

  readonly proposals = signal<SkillProposal[]>([]);
  readonly categories = signal<SkillCategory[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly canReview = signal(false);
  readonly showForm = signal(false);
  readonly displayedColumns = ['skill_name', 'category_name', 'proposed_by_name', 'reason', 'status', 'created_at', 'actions'];

  private myEmployeeId = 0;
  newSkillName = '';
  newCategory: number | undefined;
  newReason = '';
  statusFilter = '';

  ngOnInit(): void {
    this.loadProposals();
    this.skillService.listCategories().subscribe((c) => this.categories.set(c));
    this.skillService.listSkills().subscribe((s) => this.skills.set(s));
    this.meService.getProfile().subscribe((me) => {
      this.myEmployeeId = me.id;
      this.canReview.set(me.is_admin || me.is_team_lead);
    });
  }

  loadProposals(): void {
    this.proposalService.list(this.statusFilter || undefined).subscribe({
      next: (res) => this.proposals.set(res.results),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  // What approving would actually do, so a reviewer is not guessing. Mirrors the
  // backend's get_or_create, which matches on the exact name within a category.
  proposalOutcome(proposal: SkillProposal): 'creates' | 'exists' | 'no-category' {
    if (!proposal.category) return 'no-category';
    const exists = this.skills().some(
      (skill) => skill.name === proposal.skill_name && skill.category === proposal.category,
    );
    return exists ? 'exists' : 'creates';
  }

  submitProposal(): void {
    if (!this.newSkillName.trim() || !this.newCategory) return;
    this.proposalService.create({
      proposed_by: this.myEmployeeId,
      skill_name: this.newSkillName.trim(),
      category: this.newCategory,
      reason: this.newReason.trim(),
    }).subscribe({
      next: () => {
        this.newSkillName = '';
        this.newCategory = undefined;
        this.newReason = '';
        this.showForm.set(false);
        this.toast.success('TOAST.PROPOSAL_SUBMITTED');
        this.loadProposals();
      },
      error: () => { this.toast.error('TOAST.ERROR'); this.loadProposals(); },
    });
  }

  approve(id: number): void {
    this.proposalService.approve(id).subscribe({
      next: () => { this.toast.success('TOAST.PROPOSAL_APPROVED'); this.loadProposals(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.loadProposals(); },
    });
  }

  reject(id: number): void {
    this.proposalService.reject(id).subscribe({
      next: () => { this.toast.success('TOAST.PROPOSAL_REJECTED'); this.loadProposals(); },
      error: () => { this.toast.error('TOAST.ERROR'); this.loadProposals(); },
    });
  }
}
