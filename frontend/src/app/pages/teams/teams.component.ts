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
import { Team, TeamPerson, TeamService } from '../../core/team.service';
import { ToastService } from '../../core/toast.service';

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
  readonly loading = signal(true);
  readonly isAdmin = signal(false);
  readonly searchResults = signal<Employee[]>([]);
  readonly searchingFor = signal<number | null>(null);

  private myEmployeeId = 0;
  private readonly search$ = new Subject<string>();
  searchTerm = '';

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

  openSearch(teamId: number): void {
    this.searchingFor.set(this.searchingFor() === teamId ? null : teamId);
    this.searchTerm = '';
    this.searchResults.set([]);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    if (term.trim()) this.search$.next(term.trim());
  }

  // People already in the team would be a no-op, so they are filtered out.
  candidatesFor(team: Team): Employee[] {
    return this.searchResults().filter((e) => !team.members.includes(e.id));
  }

  addMember(team: Team, employeeId: number): void {
    this.saveMembers(team, [...team.members, employeeId]);
    this.searchingFor.set(null);
  }

  removeMember(team: Team, employeeId: number): void {
    this.saveMembers(team, team.members.filter((id) => id !== employeeId));
  }

  assignableLeads(team: Team): TeamPerson[] {
    return team.member_details.filter((m) => !team.team_leads.includes(m.id));
  }

  addLead(team: Team, employeeId: number): void {
    this.saveLeads(team, [...team.team_leads, employeeId]);
  }

  removeLead(team: Team, employeeId: number): void {
    this.saveLeads(team, team.team_leads.filter((id) => id !== employeeId));
  }

  private saveMembers(team: Team, memberIds: number[]): void {
    this.teamService.setMembers(team.id, memberIds).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.toast.success('TOAST.TEAM_MEMBERS_UPDATED');
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }

  private saveLeads(team: Team, leadIds: number[]): void {
    this.teamService.setLeads(team.id, leadIds).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.toast.success('TOAST.TEAM_LEADS_UPDATED');
      },
      error: () => this.toast.error('TOAST.ERROR'),
    });
  }

  private replace(updated: Team): void {
    this.teams.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }
}
