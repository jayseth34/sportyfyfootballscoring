export interface FootballMatchState {
  matchId: number;
  tournamentId?: number;
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  isLive: boolean;
  isMatchOver: boolean;
  currentMinute: number;
  extraTime: number;
  remainingSeconds: number;
  lastEventType?: string;
  updatedAt?: string;
}

