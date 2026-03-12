export interface Tournament {
  id: number;
  name: string;
  startDateIso: string;
  endDateIso: string;
  location: string;
  sportType: string;
  numberOfTeams: number;
  playersPerTeam: number;
  ownerName: string;
  admins: string[];
  profileImageUrl: string | null;
}
