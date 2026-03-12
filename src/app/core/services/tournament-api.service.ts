import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Tournament } from '../models/tournament';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  errors: unknown;
  data: T;
};

type TournamentDto = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  sportType: string;
  numberOfTeams: number;
  playersPerTeam: number;
  ownerName: string;
  admins: string[];
  profileImage: string | null;
};

@Injectable({ providedIn: 'root' })
export class TournamentApiService {
  private readonly baseUrl = 'https://be.sportyfy.in';

  constructor(private readonly http: HttpClient) {}

  getAllTournaments() {
    return this.http
      .get<ApiResponse<TournamentDto[]>>(`${this.baseUrl}/api/Tournament/GetAllTournaments`, {
        headers: { accept: '*/*' }
      })
      .pipe(
        map((res) => res.data ?? []),
        map((items) =>
          items.map<Tournament>((t) => ({
            id: t.id,
            name: t.name,
            startDateIso: t.startDate,
            endDateIso: t.endDate,
            location: t.location,
            sportType: t.sportType,
            numberOfTeams: t.numberOfTeams,
            playersPerTeam: t.playersPerTeam,
            ownerName: t.ownerName,
            admins: Array.isArray(t.admins) ? t.admins : [],
            profileImageUrl: t.profileImage
          }))
        )
      );
  }
}

