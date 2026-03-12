export interface TournamentTeam {
  id: number;
  tournamentId: number;
  teamName: string;
  teamShortName: string;
  logoUrl: string | null;
  ownerName: string;
  mobileNumber: string;
  location: string;
  playersPerTeam: number;
  playerCount: number;
  teamWalletBalance: number;
  totalAmountSpent: number;
  availableBalance: number;
}

