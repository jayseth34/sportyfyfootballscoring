export type MatchStatus = 'scheduled' | 'live' | 'ft';

export interface Match {
  id: string;
  tournamentId: number;
  roundLabel: string;
  kickoffIso: string;
  venue: string;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  events: MatchEvent[];
}

export type MatchEvent = GoalEvent | CardEvent;

export interface GoalEvent {
  id: string;
  kind: 'goal';
  createdAtIso: string;
  minute: number;
  teamId: string;
  playerId: string;
}

export interface CardEvent {
  id: string;
  kind: 'card';
  createdAtIso: string;
  minute: number;
  teamId: string;
  playerId: string;
  card: 'yellow' | 'red';
}
