import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';

import { Employee, EmployeeService } from '../../core/employee.service';
import { MeService } from '../../core/me.service';
import { Department, Team, TeamService } from '../../core/team.service';
import { ToastService } from '../../core/toast.service';

type SearchMode = 'member' | 'lead';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss',
})
export class TeamsComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly employeeService = inject(EmployeeService);
  private readonly meService = inject(MeService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly teams = signal<Team[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly isAdmin = signal(false);
  readonly searchResults = signal<Employee[]>([]);
  readonly searchContext = signal<{ teamId: number; mode: SearchMode } | null>(null);
  readonly showCreateForm = signal(false);

  private myEmployeeId = 0;
  private readonly search$ = new Subject<string>();
  searchTerm = '';
  newTeamName = '';
  newTeamDepartment: number | undefined;

  // A lead only ever manages their own teams; an admin manages all of them.
  readonly visibleTeams = computed(() => {
    if (this.isAdmin()) return this.teams();
    return this.teams().filter((team) => team.team_leads.includes(this.myEmployeeId));
  });

  readonly teamsWithoutLead = computed(
    () => this.visibleTeams().filter((t) => t.team_leads.length === 0 && t.members.length > 0),
  );

  ngOnInit(): void {
    this.meService.getProfile().subscribe((me) => {
      this.myEmployeeId = me.id;
      this.isAdmin.set(me.is_admin);
      if (me.is_admin) {
        this.teamService.listDepartments().subscribe((d) => this.departments.set(d));
      }
    });
    this.teamService.list().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => this.employeeService.list(1, term)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((page) => this.searchResults.set(page.results));
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    this.newTeamName = '';
    this.newTeamDepartment = undefined;
  }

  createTeam(): void {
    if (!this.newTeamName.trim() || !this.newTeamDepartment) return;
    this.teamService.create(this.newTeamName.trim(), this.newTeamDepartment).subscribe({
      next: (created) => {
        this.teams.update((list) => [...list, created]);
        this.showCreateForm.set(false);
        this.newTeamName = '';
        this.newTeamDepartment = undefined;
        this.toast.success('TOAST.TEAM_CREATED');
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }

  isSearching(teamId: number, mode: SearchMode): boolean {
    const context = this.searchContext();
    return context?.teamId === teamId && context.mode === mode;
  }

  openSearch(teamId: number, mode: SearchMode): void {
    this.searchContext.set(this.isSearching(teamId, mode) ? null : { teamId, mode });
    this.searchTerm = '';
    this.searchResults.set([]);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    if (term.trim()) this.search$.next(term.trim());
  }

  // Whoever already holds the role would be a no-op, so they are filtered out.
  candidatesFor(team: Team, mode: SearchMode): Employee[] {
    const taken = mode === 'lead' ? team.team_leads : team.members;
    return this.searchResults().filter((e) => !taken.includes(e.id));
  }

  addPerson(team: Team, employeeId: number, mode: SearchMode): void {
    if (mode === 'lead') {
      // A lead outside the team would have no members to review, so joining
      // the team is part of being made its lead.
      const members = team.members.includes(employeeId)
        ? team.members
        : [...team.members, employeeId];
      this.save(team, { team_leads: [...team.team_leads, employeeId], members });
    } else {
      this.save(team, { members: [...team.members, employeeId] });
    }
    this.searchContext.set(null);
  }

  removeMember(team: Team, employeeId: number): void {
    this.save(team, { members: team.members.filter((id) => id !== employeeId) });
  }

  removeLead(team: Team, employeeId: number): void {
    this.save(team, { team_leads: team.team_leads.filter((id) => id !== employeeId) });
  }

  private save(team: Team, patch: { members?: number[]; team_leads?: number[] }): void {
    const request = patch.team_leads !== undefined
      ? this.teamService.update(team.id, patch)
      : this.teamService.setMembers(team.id, patch.members!);
    request.subscribe({
      next: (updated) => {
        this.teams.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.toast.success(
          patch.team_leads !== undefined ? 'TOAST.TEAM_LEADS_UPDATED' : 'TOAST.TEAM_MEMBERS_UPDATED',
        );
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }
}
