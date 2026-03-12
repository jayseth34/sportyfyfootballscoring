export interface FootballMatchEventLog {
  id: number | string;
  matchId: number;
  minute: number;
  extraTime?: number;
  eventType: string;
  teamId: number;
  teamName?: string;
  playerId: number;
  playerName: string;
  assistPlayerId?: number;
  assistPlayerName?: string;
  cardType?: string | null;
  teamAScore: number;
  teamBScore: number;
  createdAt: string;
  isMatchOver?: boolean;
}

