import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teams.page.html',
  styleUrl: './teams.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsPageComponent {
  private readonly store = inject(AppStoreService);
  readonly tournamentId = this.store.selectedTournamentIdRequired;
  readonly teams = this.store.tournamentTeams;

  readonly ordered = computed(() => [...this.teams()].sort((a, b) => a.teamName.localeCompare(b.teamName)));

  constructor() {
    void this.store.ensureTeamsLoaded(this.tournamentId());
  }
}
