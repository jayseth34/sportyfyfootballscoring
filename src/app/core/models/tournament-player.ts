export interface TournamentPlayer {
  id: number;
  tournamentId: number;
  teamId: number;
  name: string;
  role: string;
  age: number | null;
  gender: string | null;
  village: string | null;
  profileImageUrl: string | null;
  isSold: boolean;
  soldPrice: number;
}

