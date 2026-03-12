import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Match } from '../models/match';
import { Fixture } from '../models/fixture';
import { FixtureEvent, FixtureEventInput } from '../models/fixture-event';
import { Player } from '../models/player';
import { Team } from '../models/team';
import { Tournament } from '../models/tournament';
import { TournamentTeam } from '../models/tournament-team';
import { TournamentPlayer } from '../models/tournament-player';
import { newId } from '../../shared/utils/id';
import { FixturesApiService } from './fixtures-api.service';
import { PlayersApiService } from './players-api.service';
import { TeamsApiService } from './teams-api.service';
import { TournamentApiService } from './tournament-api.service';

type AddGoalInput = {
  teamId: string;
  playerId: string;
  minute: number;
};

const SELECTED_TOURNAMENT_KEY = 'sf_tournament_id';

function readSelectedTournamentId(): number | null {
  const raw = sessionStorage.getItem(SELECTED_TOURNAMENT_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

@Injectable({ providedIn: 'root' })
export class AppStoreService {
  private readonly tournamentApi = inject(TournamentApiService);
  private readonly fixturesApi = inject(FixturesApiService);
  private readonly teamsApi = inject(TeamsApiService);
  private readonly playersApi = inject(PlayersApiService);

  private tournamentsLoadPromise: Promise<void> | null = null;
  private fixturesLoadPromiseByTournamentId = new Map<number, Promise<void>>();
  private teamsLoadPromiseByTournamentId = new Map<number, Promise<void>>();
  private playersLoadPromiseByKey = new Map<string, Promise<void>>();

  private readonly _tournaments = signal<Tournament[]>([]);
  private readonly _selectedTournamentId = signal<number | null>(readSelectedTournamentId());
  private readonly _fixturesByTournamentId = signal<Record<number, Fixture[]>>({});
  private readonly _teamsByTournamentId = signal<Record<number, TournamentTeam[]>>({});
  private readonly _playersByTournamentTeamKey = signal<Record<string, TournamentPlayer[]>>({});
  private readonly _fixtureEventsByTournamentId = signal<Record<number, Record<number, FixtureEvent[]>>>({});

  private readonly _teams = signal<Team[]>([
    {
      id: 'team_lions',
      name: 'Lions FC',
      shortName: 'LIO',
      city: 'Mumbai',
      coachName: 'Arjun Mehta',
      colors: { primary: '#2563eb', secondary: '#e2e8f0' }
    },
    {
      id: 'team_tigers',
      name: 'Tigers United',
      shortName: 'TIG',
      city: 'Pune',
      coachName: 'Ravi Kulkarni',
      colors: { primary: '#f97316', secondary: '#0f172a' }
    },
    {
      id: 'team_eagles',
      name: 'Eagles SC',
      shortName: 'EAG',
      city: 'Delhi',
      coachName: 'Neeraj Singh',
      colors: { primary: '#16a34a', secondary: '#052e16' }
    },
    {
      id: 'team_sharks',
      name: 'Sharks FC',
      shortName: 'SHA',
      city: 'Bengaluru',
      coachName: 'Karan Iyer',
      colors: { primary: '#06b6d4', secondary: '#0f172a' }
    }
  ]);

  private readonly _players = signal<Player[]>([
    { id: 'p_lio_1', teamId: 'team_lions', name: 'Ayaan Khan', shirtNumber: 1, position: 'GK' },
    { id: 'p_lio_2', teamId: 'team_lions', name: 'Rahul Das', shirtNumber: 4, position: 'DF' },
    { id: 'p_lio_3', teamId: 'team_lions', name: 'Siddharth Rao', shirtNumber: 5, position: 'DF' },
    { id: 'p_lio_4', teamId: 'team_lions', name: 'Vikram Joshi', shirtNumber: 6, position: 'MF' },
    { id: 'p_lio_5', teamId: 'team_lions', name: 'Kabir Sharma', shirtNumber: 8, position: 'MF' },
    { id: 'p_lio_6', teamId: 'team_lions', name: 'Ishaan Patel', shirtNumber: 9, position: 'FW' },
    { id: 'p_lio_7', teamId: 'team_lions', name: 'Manav Gupta', shirtNumber: 10, position: 'FW' },
    { id: 'p_lio_8', teamId: 'team_lions', name: 'Aditya Nair', shirtNumber: 11, position: 'FW' },

    { id: 'p_tig_1', teamId: 'team_tigers', name: 'Pranav Kale', shirtNumber: 1, position: 'GK' },
    { id: 'p_tig_2', teamId: 'team_tigers', name: 'Sameer Bhat', shirtNumber: 2, position: 'DF' },
    { id: 'p_tig_3', teamId: 'team_tigers', name: 'Yash Verma', shirtNumber: 3, position: 'DF' },
    { id: 'p_tig_4', teamId: 'team_tigers', name: 'Nikhil Jain', shirtNumber: 6, position: 'MF' },
    { id: 'p_tig_5', teamId: 'team_tigers', name: 'Harsh Vaidya', shirtNumber: 7, position: 'MF' },
    { id: 'p_tig_6', teamId: 'team_tigers', name: 'Aman Srivastava', shirtNumber: 9, position: 'FW' },
    { id: 'p_tig_7', teamId: 'team_tigers', name: 'Tejas Kulkarni', shirtNumber: 10, position: 'FW' },
    { id: 'p_tig_8', teamId: 'team_tigers', name: 'Omkar Deshmukh', shirtNumber: 11, position: 'FW' },

    { id: 'p_eag_1', teamId: 'team_eagles', name: 'Rohit Saini', shirtNumber: 1, position: 'GK' },
    { id: 'p_eag_2', teamId: 'team_eagles', name: 'Anmol Kapoor', shirtNumber: 4, position: 'DF' },
    { id: 'p_eag_3', teamId: 'team_eagles', name: 'Kunal Malhotra', shirtNumber: 5, position: 'DF' },
    { id: 'p_eag_4', teamId: 'team_eagles', name: 'Deepak Arora', shirtNumber: 6, position: 'MF' },
    { id: 'p_eag_5', teamId: 'team_eagles', name: 'Saurabh Rana', shirtNumber: 8, position: 'MF' },
    { id: 'p_eag_6', teamId: 'team_eagles', name: 'Vansh Chawla', shirtNumber: 9, position: 'FW' },
    { id: 'p_eag_7', teamId: 'team_eagles', name: 'Nitin Yadav', shirtNumber: 10, position: 'FW' },
    { id: 'p_eag_8', teamId: 'team_eagles', name: 'Arnav Kohli', shirtNumber: 11, position: 'FW' },

    { id: 'p_sha_1', teamId: 'team_sharks', name: 'Sahil Iqbal', shirtNumber: 1, position: 'GK' },
    { id: 'p_sha_2', teamId: 'team_sharks', name: 'Imran Ali', shirtNumber: 2, position: 'DF' },
    { id: 'p_sha_3', teamId: 'team_sharks', name: 'Ritesh Menon', shirtNumber: 3, position: 'DF' },
    { id: 'p_sha_4', teamId: 'team_sharks', name: 'Ajay Babu', shirtNumber: 6, position: 'MF' },
    { id: 'p_sha_5', teamId: 'team_sharks', name: 'Sanjay Krishnan', shirtNumber: 8, position: 'MF' },
    { id: 'p_sha_6', teamId: 'team_sharks', name: 'Karthik Shetty', shirtNumber: 9, position: 'FW' },
    { id: 'p_sha_7', teamId: 'team_sharks', name: 'Vishal Naidu', shirtNumber: 10, position: 'FW' },
    { id: 'p_sha_8', teamId: 'team_sharks', name: 'Naveen Kumar', shirtNumber: 11, position: 'FW' }
  ]);

  private readonly _matches = signal<Match[]>([
    {
      id: 'm1',
      tournamentId: 0,
      roundLabel: 'Matchday 1',
      kickoffIso: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      venue: 'City Arena',
      status: 'scheduled',
      homeTeamId: 'team_lions',
      awayTeamId: 'team_tigers',
      events: []
    },
    {
      id: 'm2',
      tournamentId: 0,
      roundLabel: 'Matchday 1',
      kickoffIso: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      venue: 'National Ground',
      status: 'scheduled',
      homeTeamId: 'team_eagles',
      awayTeamId: 'team_sharks',
      events: []
    },
    {
      id: 'm3',
      tournamentId: 0,
      roundLabel: 'Matchday 2',
      kickoffIso: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      venue: 'Riverfront Stadium',
      status: 'live',
      homeTeamId: 'team_tigers',
      awayTeamId: 'team_eagles',
      events: [
        {
          id: 'ev_1',
          kind: 'goal',
          createdAtIso: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          minute: 12,
          teamId: 'team_tigers',
          playerId: 'p_tig_6'
        }
      ]
    },
    {
      id: 'm4',
      tournamentId: 0,
      roundLabel: 'Matchday 2',
      kickoffIso: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      venue: 'Harbor Park',
      status: 'ft',
      homeTeamId: 'team_sharks',
      awayTeamId: 'team_lions',
      events: [
        {
          id: 'ev_2',
          kind: 'goal',
          createdAtIso: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 20).toISOString(),
          minute: 18,
          teamId: 'team_sharks',
          playerId: 'p_sha_6'
        },
        {
          id: 'ev_3',
          kind: 'goal',
          createdAtIso: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 55).toISOString(),
          minute: 54,
          teamId: 'team_lions',
          playerId: 'p_lio_7'
        }
      ]
    }
  ]);

  readonly tournaments = this._tournaments.asReadonly();
  readonly selectedTournamentId = this._selectedTournamentId.asReadonly();
  readonly selectedTournamentIdRequired = computed(() => this._selectedTournamentId() ?? 0);
  readonly selectedTournament = computed(() => {
    const id = this._selectedTournamentId();
    if (id === null) return null;
    return this._tournaments().find((t) => t.id === id) ?? null;
  });

  readonly fixtures = computed(() => {
    const id = this._selectedTournamentId();
    if (id === null) return [];
    return this._fixturesByTournamentId()[id] ?? [];
  });

  readonly tournamentTeams = computed(() => {
    const id = this._selectedTournamentId();
    if (id === null) return [];
    return this._teamsByTournamentId()[id] ?? [];
  });

  playersForTeam(teamId: number) {
    const tournamentId = this._selectedTournamentId();
    if (tournamentId === null) return [];
    const key = this.playersKey(tournamentId, teamId);
    return this._playersByTournamentTeamKey()[key] ?? [];
  }

  readonly teams = this._teams.asReadonly();
  readonly players = this._players.asReadonly();
  readonly matches = computed(() => {
    const id = this._selectedTournamentId();
    if (id === null) return [];
    return this._matches().filter((m) => m.tournamentId === id);
  });

  readonly upcomingMatches = computed(() =>
    [...this.matches()]
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => a.kickoffIso.localeCompare(b.kickoffIso))
  );

  readonly liveMatches = computed(() => this.matches().filter((m) => m.status === 'live'));

  async ensureTournamentsLoaded(): Promise<void> {
    if (this._tournaments().length) return;
    if (this.tournamentsLoadPromise) return this.tournamentsLoadPromise;

    this.tournamentsLoadPromise = firstValueFrom(this.tournamentApi.getAllTournaments())
      .then((items) => {
        this._tournaments.set(items);

        const selectedId = this._selectedTournamentId();
        if (selectedId !== null && !items.some((t) => t.id === selectedId)) this.clearTournament();
      })
      .catch(() => {
        this._tournaments.set([]);
        this.clearTournament();
      });

    try {
      await this.tournamentsLoadPromise;
    } finally {
      this.tournamentsLoadPromise = null;
    }
  }

  async ensureFixturesLoaded(tournamentId: number): Promise<void> {
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) return;
    if (this._fixturesByTournamentId()[tournamentId]?.length) return;

    const existing = this.fixturesLoadPromiseByTournamentId.get(tournamentId);
    if (existing) return existing;

    const promise = firstValueFrom(this.fixturesApi.getFixturesByTournamentId(tournamentId))
      .then((items) => {
        this._fixturesByTournamentId.update((map) => ({ ...map, [tournamentId]: items }));
      })
      .catch(() => {
        this._fixturesByTournamentId.update((map) => ({ ...map, [tournamentId]: [] }));
      })
      .finally(() => {
        this.fixturesLoadPromiseByTournamentId.delete(tournamentId);
      });

    this.fixturesLoadPromiseByTournamentId.set(tournamentId, promise);
    return promise;
  }

  async refreshFixtures(tournamentId: number): Promise<void> {
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) return;
    await firstValueFrom(this.fixturesApi.getFixturesByTournamentId(tournamentId))
      .then((items) => {
        this._fixturesByTournamentId.update((map) => ({ ...map, [tournamentId]: items }));
      })
      .catch(() => {
        this._fixturesByTournamentId.update((map) => ({ ...map, [tournamentId]: [] }));
      });
  }

  setFixtureLive(tournamentId: number, fixtureId: number, isLive: boolean): void {
    this._fixturesByTournamentId.update((map) => {
      const list = map[tournamentId];
      if (!list) return map;
      return {
        ...map,
        [tournamentId]: list.map((f) => (f.id === fixtureId ? { ...f, isLive } : f))
      };
    });
  }

  async ensureTeamsLoaded(tournamentId: number): Promise<void> {
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) return;
    if (this._teamsByTournamentId()[tournamentId]?.length) return;

    const existing = this.teamsLoadPromiseByTournamentId.get(tournamentId);
    if (existing) return existing;

    const promise = firstValueFrom(this.teamsApi.getAllTeamsByTournamentId(tournamentId))
      .then((items) => {
        this._teamsByTournamentId.update((map) => ({ ...map, [tournamentId]: items }));
      })
      .catch(() => {
        this._teamsByTournamentId.update((map) => ({ ...map, [tournamentId]: [] }));
      })
      .finally(() => {
        this.teamsLoadPromiseByTournamentId.delete(tournamentId);
      });

    this.teamsLoadPromiseByTournamentId.set(tournamentId, promise);
    return promise;
  }

  async ensurePlayersLoaded(tournamentId: number, teamId: number): Promise<void> {
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) return;
    if (!Number.isFinite(teamId) || teamId <= 0) return;

    const key = this.playersKey(tournamentId, teamId);
    if (this._playersByTournamentTeamKey()[key]?.length) return;

    const existing = this.playersLoadPromiseByKey.get(key);
    if (existing) return existing;

    const promise = firstValueFrom(this.playersApi.getPlayerListByTeam(teamId))
      .then((items) => {
        const filtered = items
          .filter((p) => p.tournamentId === tournamentId && p.teamId === teamId)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));

        this._playersByTournamentTeamKey.update((map) => ({ ...map, [key]: filtered }));
      })
      .catch(() => {
        this._playersByTournamentTeamKey.update((map) => ({ ...map, [key]: [] }));
      })
      .finally(() => {
        this.playersLoadPromiseByKey.delete(key);
      });

    this.playersLoadPromiseByKey.set(key, promise);
    return promise;
  }

  getTournamentById(id: number): Tournament | undefined {
    return this._tournaments().find((t) => t.id === id);
  }

  selectTournament(id: number): void {
    if (!this.getTournamentById(id)) return;
    this._selectedTournamentId.set(id);
    sessionStorage.setItem(SELECTED_TOURNAMENT_KEY, String(id));
    void this.ensureFixturesLoaded(id);
    void this.ensureTeamsLoaded(id);

    // Dummy data for now: remap fixtures to the selected tournament until match APIs arrive.
    this._matches.update((matches) => matches.map((m) => ({ ...m, tournamentId: id })));
  }

  clearTournament(): void {
    this._selectedTournamentId.set(null);
    sessionStorage.removeItem(SELECTED_TOURNAMENT_KEY);
  }

  getFixtureById(id: number): Fixture | undefined {
    if (!Number.isFinite(id)) return undefined;
    return Object.values(this._fixturesByTournamentId())
      .flat()
      .find((f) => f.id === id);
  }

  eventsForFixture(fixtureId: number): FixtureEvent[] {
    const tournamentId = this._selectedTournamentId();
    if (tournamentId === null) return [];
    return this._fixtureEventsByTournamentId()[tournamentId]?.[fixtureId] ?? [];
  }

  scoreForFixture(fixture: Fixture): { teamA: number; teamB: number } {
    const events = this.eventsForFixture(fixture.id);
    let teamA = 0;
    let teamB = 0;
    for (const ev of events) {
      if (ev.kind !== 'goal') continue;
      if (ev.teamId === fixture.teamAId) teamA += 1;
      if (ev.teamId === fixture.teamBId) teamB += 1;
    }
    return { teamA, teamB };
  }

  addFixtureEvent(fixtureId: number, event: FixtureEventInput): void {
    const tournamentId = this._selectedTournamentId();
    if (tournamentId === null) return;

    this._fixtureEventsByTournamentId.update((map) => {
      const tournamentMap = map[tournamentId] ?? {};
      const current = tournamentMap[fixtureId] ?? [];
      const next: FixtureEvent = {
        ...event,
        id: newId('fev'),
        createdAtIso: new Date().toISOString()
      } as FixtureEvent;

      return {
        ...map,
        [tournamentId]: {
          ...tournamentMap,
          [fixtureId]: [...current, next].sort((a, b) => a.minute - b.minute)
        }
      };
    });
  }

  removeFixtureEvent(fixtureId: number, eventId: string): void {
    const tournamentId = this._selectedTournamentId();
    if (tournamentId === null) return;

    this._fixtureEventsByTournamentId.update((map) => {
      const tournamentMap = map[tournamentId];
      if (!tournamentMap?.[fixtureId]) return map;
      return {
        ...map,
        [tournamentId]: {
          ...tournamentMap,
          [fixtureId]: tournamentMap[fixtureId]!.filter((e) => e.id !== eventId)
        }
      };
    });
  }

  getTournamentTeamById(id: number): TournamentTeam | undefined {
    if (!Number.isFinite(id)) return undefined;
    return Object.values(this._teamsByTournamentId())
      .flat()
      .find((t) => t.id === id);
  }

  private playersKey(tournamentId: number, teamId: number): string {
    return `${tournamentId}:${teamId}`;
  }

  getTeamById(id: string): Team | undefined {
    return this._teams().find((t) => t.id === id);
  }

  getPlayerById(id: string): Player | undefined {
    return this._players().find((p) => p.id === id);
  }

  getPlayersByTeam(teamId: string): Player[] {
    return this._players()
      .filter((p) => p.teamId === teamId)
      .slice()
      .sort((a, b) => a.shirtNumber - b.shirtNumber);
  }

  getMatchById(id: string): Match | undefined {
    const match = this._matches().find((m) => m.id === id);
    const selected = this._selectedTournamentId();
    if (!match) return undefined;
    if (selected === null) return undefined;
    if (match.tournamentId !== selected) return undefined;
    return match;
  }

  getMatchesForTeam(teamId: string): Match[] {
    return this.matches()
      .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
      .slice()
      .sort((a, b) => a.kickoffIso.localeCompare(b.kickoffIso));
  }

  scoreForMatch(match: Match): { home: number; away: number } {
    let home = 0;
    let away = 0;
    for (const ev of match.events) {
      if (ev.kind !== 'goal') continue;
      if (ev.teamId === match.homeTeamId) home += 1;
      if (ev.teamId === match.awayTeamId) away += 1;
    }
    return { home, away };
  }

  addGoal(matchId: string, input: AddGoalInput): void {
    this._matches.update((matches) =>
      matches.map((m) => {
        if (m.id !== matchId) return m;
        const next = {
          id: newId('ev'),
          kind: 'goal' as const,
          createdAtIso: new Date().toISOString(),
          minute: Math.max(0, Math.min(130, Math.floor(input.minute))),
          teamId: input.teamId,
          playerId: input.playerId
        };
        return { ...m, events: [...m.events, next].sort((a, b) => a.minute - b.minute) };
      })
    );
  }

  removeEvent(matchId: string, eventId: string): void {
    this._matches.update((matches) =>
      matches.map((m) => {
        if (m.id !== matchId) return m;
        return { ...m, events: m.events.filter((e) => e.id !== eventId) };
      })
    );
  }
}
