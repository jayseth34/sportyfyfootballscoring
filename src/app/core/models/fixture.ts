export interface Fixture {
  id: number;
  tournamentId: number;
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
  teamALogoUrl: string | null;
  teamBLogoUrl: string | null;
  venue: string;
  date: string;
  timeAt: string;
  isLive: boolean;
  status: string | null;
  result: string;
  matchName: string;
}

