import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { backendBaseUrl } from '../config/backend-endpoints';
import { TournamentPlayer } from '../models/tournament-player';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  errors: unknown;
  data: T;
};

type PlayerDto = {
  id: number;
  tournamentId: number;
  teamId: number;
  name: string;
  village: string | null;
  age: number | null;
  gender: string | null;
  role: string;
  profileImage: string | null;
  isSold: boolean;
  soldPrice: number;
};

@Injectable({ providedIn: 'root' })
export class PlayersApiService {
  private readonly baseUrl = backendBaseUrl();

  constructor(private readonly http: HttpClient) {}

  getPlayerListByTeam(teamId: number) {
    return this.http
      .get<ApiResponse<PlayerDto[]>>(`${this.baseUrl}/api/Player/GetPlayerListByTeam/${teamId}`, {
        headers: { accept: '*/*' }
      })
      .pipe(
        map((res) => res.data ?? []),
        map((items) =>
          items.map<TournamentPlayer>((p) => ({
            id: p.id,
            tournamentId: p.tournamentId,
            teamId: p.teamId,
            name: p.name,
            role: p.role,
            age: p.age ?? null,
            gender: p.gender ?? null,
            village: p.village ?? null,
            profileImageUrl: p.profileImage ?? null,
            isSold: !!p.isSold,
            soldPrice: p.soldPrice ?? 0
          }))
        )
      );
  }
}
