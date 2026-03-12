import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStoreService } from '../../core/services/app-store.service';
import { Fixture } from '../../core/models/fixture';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly store = inject(AppStoreService);

  readonly tournamentId = this.store.selectedTournamentIdRequired;
  readonly teams = this.store.tournamentTeams;
  readonly fixtures = this.store.fixtures;

  readonly live = computed(() => this.fixtures().filter((f) => f.isLive));
  readonly upcoming = computed(() => this.fixtures().filter((f) => !f.isLive));

  readonly kpis = computed(() => ({
    teams: this.teams().length,
    matches: this.fixtures().length,
    live: this.live().length
  }));

  constructor() {
    void this.store.ensureFixturesLoaded(this.tournamentId());
    void this.store.ensureTeamsLoaded(this.tournamentId());
  }

  fixtureSubline(f: Fixture): string {
    const time = f.timeAt && f.timeAt.trim().length ? f.timeAt : 'TBD';
    return `${f.matchName} • ${f.venue} • ${f.date} • ${time}`;
  }
}
