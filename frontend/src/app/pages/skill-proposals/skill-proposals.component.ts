import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TranslateModule } from '@ngx-translate/core';

import { MeService } from '../../core/me.service';
import { SkillCategory, SkillService } from '../../core/skill.service';
import { SkillProposal, SkillProposalService } from '../../core/skill-proposal.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-skill-proposals',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    TranslateModule,
  ],
  templateUrl: './skill-proposals.component.html',
  styleUrl: './skill-proposals.component.scss',
})
export class SkillProposalsComponent implements OnInit {
  private readonly proposalService = inject(SkillProposalService);
  private readonly skillService = inject(SkillService);
  private readonly meService = inject(MeService);
  private readonly toast = inject(ToastService);

  readonly proposals = signal<SkillProposal[]>([]);
  readonly categories = signal<SkillCategory[]>([]);
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

  submitProposal(): void {
    if (!this.newSkillName.trim()) return;
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
