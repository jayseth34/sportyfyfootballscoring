import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  selector: 'app-team-detail-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-detail.page.html',
  styleUrl: './team-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamDetailPageComponent {
  private readonly store = inject(AppStoreService);
  private readonly route = inject(ActivatedRoute);
  readonly tournamentId = this.store.selectedTournamentIdRequired;

  readonly teamId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('teamId') ?? 'NaN'))), {
    initialValue: Number.NaN
  });

  constructor() {
    void this.store.ensureTeamsLoaded(this.tournamentId());

    effect(() => {
      const tournamentId = this.tournamentId();
      const teamId = this.teamId();
      if (!Number.isFinite(teamId)) return;
      void this.store.ensurePlayersLoaded(tournamentId, teamId);
    });
  }

  readonly team = computed(() => {
    const id = this.teamId();
    if (!Number.isFinite(id)) return undefined;
    return this.store.getTournamentTeamById(id);
  });

  readonly players = computed(() => {
    const id = this.teamId();
    if (!Number.isFinite(id)) return [];
    return this.store.playersForTeam(id);
  });
}
