import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { backendBaseUrl } from '../config/backend-endpoints';
import { TournamentTeam } from '../models/tournament-team';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  errors: unknown;
  data: T;
};

type TeamDto = {
  id: number;
  players_per_team: number;
  team_wallet_balance: number;
  team_name: string;
  logo_url: string;
  team_short_name: string;
  mobile_number: string;
  owner_name: string;
  player_count: number;
  total_amount_spent: number;
  available_balance: number;
  location: string;
};

@Injectable({ providedIn: 'root' })
export class TeamsApiService {
  private readonly baseUrl = backendBaseUrl();

  constructor(private readonly http: HttpClient) {}

  getAllTeamsByTournamentId(tournamentId: number) {
    return this.http
      .get<ApiResponse<TeamDto[]>>(`${this.baseUrl}/api/Team/GetAllTeamsByTournamentId`, {
        headers: { accept: '*/*' },
        params: { id: tournamentId }
      })
      .pipe(
        map((res) => res.data ?? []),
        map((items) =>
          items.map<TournamentTeam>((t) => ({
            id: t.id,
            tournamentId,
            teamName: t.team_name,
            teamShortName: t.team_short_name,
            logoUrl: t.logo_url && t.logo_url.trim().length ? t.logo_url : null,
            ownerName: t.owner_name,
            mobileNumber: t.mobile_number,
            location: t.location,
            playersPerTeam: t.players_per_team,
            playerCount: t.player_count,
            teamWalletBalance: t.team_wallet_balance,
            totalAmountSpent: t.total_amount_spent,
            availableBalance: t.available_balance
          }))
        )
      );
  }
}
