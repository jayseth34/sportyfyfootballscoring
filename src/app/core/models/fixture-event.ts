export type FixtureEventKind = 'goal' | 'card';

export type FixtureEvent = GoalEvent | CardEvent;

export interface GoalEvent {
  id: string;
  kind: 'goal';
  createdAtIso: string;
  minute: number;
  teamId: number;
  playerId: number;
}

export interface CardEvent {
  id: string;
  kind: 'card';
  createdAtIso: string;
  minute: number;
  teamId: number;
  playerId: number;
  card: 'yellow' | 'red';
}

export type FixtureEventInput =
  | Omit<GoalEvent, 'id' | 'createdAtIso'>
  | Omit<CardEvent, 'id' | 'createdAtIso'>;
