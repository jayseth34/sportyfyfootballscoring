import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { backendBaseUrl } from '../config/backend-endpoints';
import { FootballMatchEventLog } from '../models/football-match-event-log';
import { FootballMatchState } from '../models/football-match-state';
import { FootballLiveUpdate } from '../models/football-live-update';

type ApiResponse<T> = {
  statusCode: number;
  message: string;
  errors: unknown;
  data: T;
};

@Injectable({ providedIn: 'root' })
export class FootballScoreApiService {
  private readonly baseUrl = backendBaseUrl();

  constructor(private readonly http: HttpClient) {}

  updateFootball(dto: FootballLiveUpdate) {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/api/Score/update-football`, dto, {
        headers: { accept: '*/*', 'Content-Type': 'application/json' }
      })
      .pipe(map((res) => res.data));
  }

  matchOver(matchId: number) {
    return this.http
      .get<ApiResponse<boolean>>(`${this.baseUrl}/api/Score/MatchOverFootball`, {
        headers: { accept: '*/*' },
        params: { matchId }
      })
      .pipe(map((res) => res.data));
  }

  getMatchState(matchId: number) {
    return this.http
      .get<ApiResponse<FootballMatchState>>(`${this.baseUrl}/api/Score/football/match-state`, {
        headers: { accept: '*/*' },
        params: { matchId }
      })
      .pipe(map((res) => res.data));
  }

  getMatchEvents(matchId: number) {
    return this.http
      .get<ApiResponse<FootballMatchEventLog[]>>(`${this.baseUrl}/api/Score/football/events`, {
        headers: { accept: '*/*' },
        params: { matchId }
      })
      .pipe(map((res) => res.data ?? []));
  }
}
