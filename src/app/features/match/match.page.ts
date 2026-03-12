import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { AdminAccessService } from '../../core/services/admin-access.service';
import { AppStoreService } from '../../core/services/app-store.service';
import { FootballMatchEventLog } from '../../core/models/football-match-event-log';
import { FootballMatchState } from '../../core/models/football-match-state';
import { FootballScoreApiService } from '../../core/services/football-score-api.service';
import { FootballSignalRService } from '../../core/services/football-signalr.service';
import { FootballLiveUpdate } from '../../core/models/football-live-update';

@Component({
  selector: 'app-match-page',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './match.page.html',
  styleUrl: './match.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchPageComponent {
  private readonly store = inject(AppStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly adminAccess = inject(AdminAccessService);
  private readonly scoreApi = inject(FootballScoreApiService);
  private readonly live = inject(FootballSignalRService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tournamentId = this.store.selectedTournamentIdRequired;
  readonly isAdmin = computed(() => {
    const t = this.store.selectedTournament();
    return t ? this.adminAccess.hasAccess(t) : false;
  });

  readonly fixtureId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('matchId') ?? 'NaN'))), {
    initialValue: Number.NaN
  });

  readonly matchState = signal<FootballMatchState | null>(null);
  readonly matchEvents = signal<FootballMatchEventLog[]>([]);
  readonly loading = signal(false);
  readonly requestError = signal<string | null>(null);

  constructor() {
    void this.store.ensureFixturesLoaded(this.tournamentId());

    effect(() => {
      const f = this.fixture();
      if (!f) return;
      void this.store.ensurePlayersLoaded(this.tournamentId(), f.teamAId);
      void this.store.ensurePlayersLoaded(this.tournamentId(), f.teamBId);
      if (!this.selectedTeamId()) this.setSelectedTeam(f.teamAId);
      void this.live.connect(f.id);
      void this.loadMatchData(f.id);
    });

    effect(() => {
      const update = this.live.lastUpdate();
      const f = this.fixture();
      if (!update || !f || update.matchId !== f.id) return;

      this.matchState.update((current) => {
        if (!current) return current;
        return {
          ...current,
          teamAScore: update.teamAScore,
          teamBScore: update.teamBScore,
          currentMinute: update.currentMinute,
          extraTime: update.extraTime,
          remainingSeconds: update.remainingSeconds,
          isLive: !update.isMatchOver && current.isLive,
          isMatchOver: update.isMatchOver,
          lastEventType: update.eventType
        };
      });

      if (update.eventType.toLowerCase() !== 'clock') {
        void this.loadEvents(update.matchId);
      }

      if (update.isMatchOver) {
        this.store.setFixtureLive(this.tournamentId(), update.matchId, false);
      }
    });

    this.destroyRef.onDestroy(() => {
      void this.live.disconnect();
    });
  }

  readonly fixture = computed(() => {
    const id = this.fixtureId();
    if (!Number.isFinite(id)) return undefined;
    return this.store.getFixtureById(id);
  });

  readonly score = computed(() => {
    const state = this.matchState();
    if (!state) return { teamA: 0, teamB: 0 };
    return { teamA: state.teamAScore, teamB: state.teamBScore };
  });

  readonly lastLiveUpdate = this.live.lastUpdate;
  readonly events = this.matchEvents.asReadonly();

  readonly teamAPlayers = computed(() => {
    const f = this.fixture();
    if (!f) return [];
    return this.store.playersForTeam(f.teamAId);
  });

  readonly teamBPlayers = computed(() => {
    const f = this.fixture();
    if (!f) return [];
    return this.store.playersForTeam(f.teamBId);
  });

  readonly selectedTeamId = signal<number>(0);
  readonly selectedPlayerId = signal<number>(0);
  readonly minute = signal<number>(1);
  readonly kind = signal<'goal' | 'yellow' | 'red'>('goal');

  readonly playerOptions = computed(() => {
    const f = this.fixture();
    if (!f) return [];
    const teamId = this.selectedTeamId();
    return teamId === f.teamAId ? this.teamAPlayers() : this.teamBPlayers();
  });

  teamName(teamId: number): string {
    const f = this.fixture();
    if (!f) return 'Unknown';
    if (teamId === f.teamAId) return f.teamAName;
    if (teamId === f.teamBId) return f.teamBName;
    return `Team ${teamId}`;
  }

  playerName(playerId: number): string {
    const all = [...this.teamAPlayers(), ...this.teamBPlayers()];
    const p = all.find((x) => x.id === playerId);
    return p ? p.name : `Player ${playerId}`;
  }

  onTeamChange(teamId: number): void {
    this.setSelectedTeam(Number(teamId));
  }

  private setSelectedTeam(teamId: number): void {
    this.selectedTeamId.set(Number(teamId));
    const players = this.playerOptions();
    this.selectedPlayerId.set(players[0]?.id ?? 0);
  }

  addEvent(): void {
    const f = this.fixture();
    if (!f) return;
    if (!this.isAdmin()) return;
    if (!f.isLive) return;

    const teamId = this.selectedTeamId();
    const playerId = this.selectedPlayerId();
    if (!teamId || !playerId) return;

    const m = Math.max(0, Math.min(130, Math.floor(Number(this.minute()))));
    const k = this.kind();

    void this.pushLiveUpdate(f, {
      eventType: k === 'goal' ? 'goal' : 'card',
      currentMinute: m,
      teamId,
      playerId,
      cardType: k === 'goal' ? null : k
    });
  }

  statusLabel(): string {
    const state = this.matchState();
    const f = this.fixture();
    if (!f) return '';
    if (state?.isMatchOver) return 'FT';
    if (state?.isLive ?? f.isLive) return 'LIVE';
    if (f.status && f.status.trim().length) return f.status.toUpperCase();
    return 'SCHEDULED';
  }

  toggleLive(next: boolean): void {
    const f = this.fixture();
    if (!f) return;
    if (!this.isAdmin()) return;
    this.store.setFixtureLive(this.tournamentId(), f.id, next);
    this.matchState.update((current) =>
      current
        ? {
            ...current,
            isLive: next,
            isMatchOver: !next ? current.isMatchOver : false
          }
        : current
    );

    if (next) {
      void this.pushClockUpdate(f, 0);
      return;
    }

    void this.markMatchOver(f);
  }

  private async pushClockUpdate(fixture: NonNullable<ReturnType<typeof this.fixture>>, minute: number): Promise<void> {
    const state = this.matchState();
    const dto: FootballLiveUpdate = {
      matchId: fixture.id,
      tournamentId: this.tournamentId(),
      teamAId: fixture.teamAId,
      teamAName: fixture.teamAName,
      teamBId: fixture.teamBId,
      teamBName: fixture.teamBName,
      teamAScore: state?.teamAScore ?? 0,
      teamBScore: state?.teamBScore ?? 0,
      currentMinute: minute,
      extraTime: 0,
      eventType: 'clock',
      teamId: 0,
      teamName: '',
      playerId: 0,
      playerName: '',
      assistPlayerId: 0,
      assistPlayerName: '',
      cardType: null,
      isMatchOver: false,
      remainingSeconds: 0
    };

    try {
      await firstValueFrom(this.scoreApi.updateFootball(dto));
    } catch {
      // ignore
    }
  }

  private async markMatchOver(fixture: NonNullable<ReturnType<typeof this.fixture>>): Promise<void> {
    try {
      await firstValueFrom(this.scoreApi.matchOver(fixture.id));
    } catch {
      // ignore
    }
    await this.store.refreshFixtures(this.tournamentId());
    await this.loadMatchData(fixture.id);
  }

  private async pushLiveUpdate(
    fixture: NonNullable<ReturnType<typeof this.fixture>>,
    input: Pick<FootballLiveUpdate, 'eventType' | 'currentMinute' | 'teamId' | 'playerId' | 'cardType'>
  ): Promise<void> {
    const current = this.matchState();
    const currentScore = {
      teamA: current?.teamAScore ?? 0,
      teamB: current?.teamBScore ?? 0
    };
    const nextScore =
      input.eventType === 'goal'
        ? {
            teamA: currentScore.teamA + (input.teamId === fixture.teamAId ? 1 : 0),
            teamB: currentScore.teamB + (input.teamId === fixture.teamBId ? 1 : 0)
          }
        : currentScore;

    const playerName = this.playerName(input.playerId);

    const dto: FootballLiveUpdate = {
      matchId: fixture.id,
      tournamentId: this.tournamentId(),
      teamAId: fixture.teamAId,
      teamAName: fixture.teamAName,
      teamBId: fixture.teamBId,
      teamBName: fixture.teamBName,
      teamAScore: nextScore.teamA,
      teamBScore: nextScore.teamB,
      currentMinute: input.currentMinute,
      extraTime: current?.extraTime ?? 0,
      eventType: input.eventType,
      teamId: input.teamId,
      teamName: this.teamName(input.teamId),
      playerId: input.playerId,
      playerName,
      assistPlayerId: 0,
      assistPlayerName: '',
      cardType: input.cardType ?? null,
      isMatchOver: false,
      remainingSeconds: current?.remainingSeconds ?? 0
    };

    try {
      await firstValueFrom(this.scoreApi.updateFootball(dto));
      await this.loadMatchData(fixture.id);
    } catch {
      // keep current UI state; backend remains source of truth
    }
  }

  private async loadMatchData(matchId: number): Promise<void> {
    await Promise.all([this.loadState(matchId), this.loadEvents(matchId)]);
  }

  private async loadState(matchId: number): Promise<void> {
    this.loading.set(true);
    this.requestError.set(null);
    try {
      const state = await firstValueFrom(this.scoreApi.getMatchState(matchId));
      this.matchState.set(state);
      this.store.setFixtureLive(this.tournamentId(), matchId, state.isLive);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.requestError.set(null);
        this.matchState.set(null);
      } else {
        this.requestError.set('Failed to load match state.');
        this.matchState.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadEvents(matchId: number): Promise<void> {
    try {
      const events = await firstValueFrom(this.scoreApi.getMatchEvents(matchId));
      this.matchEvents.set(
        [...events].sort((a, b) => {
          if (a.minute !== b.minute) return a.minute - b.minute;
          return (a.extraTime ?? 0) - (b.extraTime ?? 0);
        })
      );
    } catch {
      this.matchEvents.set([]);
    }
  }
}
