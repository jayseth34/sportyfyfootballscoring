import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Fixture } from '../models/fixture';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  errors: unknown;
  data: T;
};

type FixtureDto = {
  id: number;
  tournamentId: number;
  teamAId: number;
  teamBId: number;
  venue: string;
  date: string;
  timeAt: string;
  status: string | null;
  result: string;
  isLive: boolean;
  matchName: string;
  teamAName: string;
  teamBName: string;
  teamALogo: string | null;
  teamBLogo: string | null;
};

@Injectable({ providedIn: 'root' })
export class FixturesApiService {
  private readonly baseUrl = 'https://be.sportyfy.in';

  constructor(private readonly http: HttpClient) {}

  getFixturesByTournamentId(tournamentId: number) {
    return this.http
      .get<ApiResponse<FixtureDto[]>>(`${this.baseUrl}/api/Tournament/GetFixturesByTournamentId`, {
        headers: { accept: '*/*' },
        params: { id: tournamentId }
      })
      .pipe(
        map((res) => res.data ?? []),
        map((items) =>
          items.map<Fixture>((f) => ({
            id: f.id,
            tournamentId: f.tournamentId,
            teamAId: f.teamAId,
            teamBId: f.teamBId,
            teamAName: f.teamAName,
            teamBName: f.teamBName,
            teamALogoUrl: f.teamALogo,
            teamBLogoUrl: f.teamBLogo,
            venue: f.venue,
            date: f.date,
            timeAt: f.timeAt,
            isLive: f.isLive,
            status: f.status,
            result: f.result,
            matchName: f.matchName
          }))
        )
      );
  }

  addFixture(input: {
    tournamentId: number;
    teamAId: number;
    teamBId: number;
    venue: string;
    date: string;
    timeAt: string;
    matchName: string;
    status: string;
    result: string;
    isLive: boolean;
  }) {
    // Backend is shared across sports; keep cricket fields empty for football.
    const payload = {
      ...input,
      teamARuns: '',
      teamAWickets: '',
      teamAOvers: '',
      teamBRuns: '',
      teamBWickets: '',
      teamBOvers: ''
    };

    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/api/Tournament/AddFixture`, payload, {
        headers: { accept: 'application/json' }
      })
      .pipe(map((res) => res.data));
  }
}
