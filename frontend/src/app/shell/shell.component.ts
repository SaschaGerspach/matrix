import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { MeService } from '../core/me.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly meService = inject(MeService);
  private readonly router = inject(Router);

  readonly isTeamLead = signal(false);
  readonly isAdmin = signal(false);

  ngOnInit(): void {
    this.meService.getProfile().subscribe({
      next: (profile) => {
        this.isTeamLead.set(profile.is_team_lead);
        this.isAdmin.set(profile.is_admin);
      },
    });
  }

  logout(): void {
    this.meService.clearCache();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
