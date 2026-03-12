export interface FootballLiveUpdate {
  matchId: number;
  tournamentId?: number;
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  currentMinute: number;
  extraTime: number;
  eventType: string;
  teamId: number;
  teamName?: string;
  playerId: number;
  playerName: string;
  assistPlayerId: number;
  assistPlayerName: string;
  cardType?: string | null;
  isMatchOver: boolean;
  remainingSeconds: number;
}
