import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
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
  private readonly activeMatchId = signal<number | null>(null);

  constructor() {
    void this.store.ensureFixturesLoaded(this.tournamentId());

    effect(() => {
      const f = this.fixture();
      if (!f) return;
      if (this.activeMatchId() === f.id) return;

      this.activeMatchId.set(f.id);
      this.matchState.set(this.buildFallbackState(f));
      this.matchEvents.set([]);
      this.requestError.set(null);

      untracked(() => {
        void this.store.ensurePlayersLoaded(this.tournamentId(), f.teamAId);
        void this.store.ensurePlayersLoaded(this.tournamentId(), f.teamBId);
        this.setSelectedTeam(f.teamAId);
        void this.live.connect(f.id);
        void this.loadMatchData(f.id);
      });
    });

    effect(() => {
      const f = this.fixture();
      if (!f) return;
      const selectedTeamId = this.selectedTeamId();
      if (selectedTeamId === f.teamAId || selectedTeamId === f.teamBId) return;

      untracked(() => {
        this.setSelectedTeam(f.teamAId);
      });
    });

    effect(() => {
      const update = this.live.lastUpdate();
      const f = this.fixture();
      if (!update || !f || update.matchId !== f.id) return;

      this.matchState.update((current) => {
        if (!current) {
          return {
            ...this.buildFallbackState(f),
            teamAScore: update.teamAScore,
            teamBScore: update.teamBScore,
            currentMinute: update.currentMinute,
            extraTime: update.extraTime,
            remainingSeconds: update.remainingSeconds,
            isLive: !update.isMatchOver,
            isMatchOver: update.isMatchOver,
            lastEventType: update.eventType
          };
        }
        return {
          ...current,
          teamAScore: update.teamAScore,
          teamBScore: update.teamBScore,
          currentMinute: update.currentMinute,
          extraTime: update.extraTime,
          remainingSeconds: update.remainingSeconds,
          isLive: update.eventType.toLowerCase() === 'clock' ? true : !update.isMatchOver && current.isLive,
          isMatchOver: update.isMatchOver,
          lastEventType: update.eventType
        };
      });

      if (update.eventType.toLowerCase() !== 'clock') {
        this.upsertLiveEvent(update);
      }

      this.store.setFixtureLive(this.tournamentId(), update.matchId, !update.isMatchOver);
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
  readonly liveConnected = this.live.connected;
  readonly liveConnectionError = this.live.connectionError;
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
    const f = this.fixture();
    if (!f) {
      this.selectedPlayerId.set(0);
      return;
    }
    const players = Number(teamId) === f.teamAId ? this.teamAPlayers() : this.teamBPlayers();
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
    } catch {
      // keep current UI state; backend remains source of truth
    }
  }

  private async loadMatchData(matchId: number): Promise<void> {
    await Promise.all([this.loadState(matchId), this.loadEvents(matchId)]);
  }

  private async loadState(matchId: number): Promise<void> {
    this.loading.set(true);
    try {
      const state = await firstValueFrom(this.scoreApi.getMatchState(matchId));
      this.matchState.set(state);
      this.store.setFixtureLive(this.tournamentId(), matchId, state.isLive);
      this.requestError.set(null);
    } catch (error) {
      // Initial state is optional until the first backend score update/start event.
      if (
        (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400 || error.status === 204)) ||
        !this.fixture()?.isLive
      ) {
        this.requestError.set(null);
        const fixture = this.fixture();
        this.matchState.set(fixture ? this.buildFallbackState(fixture) : null);
      } else {
        this.requestError.set('Live state is unavailable right now.');
        const fixture = this.fixture();
        this.matchState.set(fixture ? this.buildFallbackState(fixture) : null);
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

  private buildFallbackState(fixture: NonNullable<ReturnType<typeof this.fixture>>): FootballMatchState {
    return {
      matchId: fixture.id,
      tournamentId: this.tournamentId(),
      teamAId: fixture.teamAId,
      teamAName: fixture.teamAName,
      teamBId: fixture.teamBId,
      teamBName: fixture.teamBName,
      teamAScore: 0,
      teamBScore: 0,
      isLive: fixture.isLive,
      isMatchOver: false,
      currentMinute: 0,
      extraTime: 0,
      remainingSeconds: 0,
      lastEventType: undefined
    };
  }

  private upsertLiveEvent(update: FootballLiveUpdate): void {
    if (update.eventType.toLowerCase() !== 'goal' && update.eventType.toLowerCase() !== 'card') {
      return;
    }

    const event: FootballMatchEventLog = {
      id: `${update.matchId}-${update.eventType}-${update.teamId}-${update.playerId}-${update.currentMinute}-${update.remainingSeconds}-${update.teamAScore}-${update.teamBScore}`,
      matchId: update.matchId,
      minute: update.currentMinute,
      extraTime: update.extraTime,
      eventType: update.eventType.toLowerCase(),
      teamId: update.teamId,
      teamName: update.teamName,
      playerId: update.playerId,
      playerName: update.playerName,
      assistPlayerId: update.assistPlayerId,
      assistPlayerName: update.assistPlayerName,
      cardType: update.cardType ?? null,
      teamAScore: update.teamAScore,
      teamBScore: update.teamBScore,
      createdAt: new Date().toISOString(),
      isMatchOver: update.isMatchOver
    };

    this.matchEvents.update((current) => {
      const exists = current.some((item) => item.id === event.id);
      if (exists) return current;
      return [...current, event].sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        return (a.extraTime ?? 0) - (b.extraTime ?? 0);
      });
    });
  }
}
