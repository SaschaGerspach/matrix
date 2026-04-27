import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../environments/environment';

export interface TeamKpi {
  team_id: number;
  team_name: string;
  member_count: number;
  avg_level: number;
  coverage: number;
  total_assignments: number;
  confirmed_ratio: number;
}

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
})
export class KpiComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly data = signal<TeamKpi[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.http.get<TeamKpi[]>(`${environment.apiUrl}/kpi/`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
