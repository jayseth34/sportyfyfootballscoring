import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppStoreService } from '../../core/services/app-store.service';
import { Fixture } from '../../core/models/fixture';
import { FixturesApiService } from '../../core/services/fixtures-api.service';
import { FootballScoreApiService } from '../../core/services/football-score-api.service';
import { FootballLiveUpdate } from '../../core/models/football-live-update';

type AddFixtureForm = {
  teamAId: number;
  teamBId: number;
  venue: string;
  date: string;
  timeAt: string;
  matchName: string;
  status: string;
  result: string;
  isLive: boolean;
};

@Component({
  selector: 'app-scoring-console-page',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './scoring-console.page.html',
  styleUrl: './scoring-console.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringConsolePageComponent {
  private readonly store = inject(AppStoreService);
  private readonly fixturesApi = inject(FixturesApiService);
  private readonly scoreApi = inject(FootballScoreApiService);
  readonly tournamentId = this.store.selectedTournamentIdRequired;
  readonly fixtures = this.store.fixtures;
  readonly teams = this.store.tournamentTeams;

  readonly ordered = computed(() => [...this.fixtures()].sort((a, b) => b.id - a.id));

  readonly addOpen = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = signal<AddFixtureForm>({
    teamAId: 0,
    teamBId: 0,
    venue: '',
    date: '',
    timeAt: '',
    matchName: '',
    status: '',
    result: '',
    isLive: false
  });

  patchForm(patch: Partial<AddFixtureForm>): void {
    this.form.update((curr) => ({ ...curr, ...patch }));
  }

  constructor() {
    void this.store.ensureFixturesLoaded(this.tournamentId());
    void this.store.ensureTeamsLoaded(this.tournamentId());
  }

  statusLabel(f: Fixture): string {
    if (f.isLive) return 'LIVE';
    if (f.status && f.status.trim().length) return f.status.toUpperCase();
    return 'SCHEDULED';
  }

  toggleLive(f: Fixture, next: boolean): void {
    this.store.setFixtureLive(this.tournamentId(), f.id, next);
    if (next) {
      void this.pushClockUpdate(f, 0);
      return;
    }
    void this.markMatchOver(f);
  }

  private async pushClockUpdate(f: Fixture, minute: number): Promise<void> {
    const dto: FootballLiveUpdate = {
      matchId: f.id,
      teamAId: f.teamAId,
      teamAName: f.teamAName,
      teamBId: f.teamBId,
      teamBName: f.teamBName,
      teamAScore: 0,
      teamBScore: 0,
      currentMinute: minute,
      extraTime: 0,
      eventType: 'clock',
      teamId: 0,
      playerId: 0,
      playerName: '',
      assistPlayerId: 0,
      assistPlayerName: '',
      isMatchOver: false,
      remainingSeconds: 0
    };

    try {
      await firstValueFrom(this.scoreApi.updateFootball(dto));
    } catch {
      // ignore
    }
  }

  private async markMatchOver(f: Fixture): Promise<void> {
    try {
      await firstValueFrom(this.scoreApi.matchOver(f.id));
    } catch {
      // ignore
    }
    await this.store.refreshFixtures(this.tournamentId());
  }

  openAdd(): void {
    this.error.set(null);
    const teams = this.teams();
    const teamAId = teams[0]?.id ?? 0;
    const teamBId = teams[1]?.id ?? 0;
    this.form.set({
      teamAId,
      teamBId,
      venue: '',
      date: '',
      timeAt: '',
      matchName: '',
      status: '',
      result: '',
      isLive: false
    });
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
  }

  async saveFixture(): Promise<void> {
    const tournamentId = this.tournamentId();
    const f = this.form();

    if (!f.teamAId || !f.teamBId || f.teamAId === f.teamBId) {
      this.error.set('Select two different teams.');
      return;
    }
    if (!f.venue.trim() || !f.date.trim() || !f.matchName.trim()) {
      this.error.set('Venue, date, and match name are required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.fixturesApi.addFixture({
          tournamentId,
          teamAId: f.teamAId,
          teamBId: f.teamBId,
          venue: f.venue.trim(),
          date: this.toApiDate(f.date),
          timeAt: this.toApiTime(f.timeAt),
          matchName: f.matchName.trim(),
          status: f.status.trim(),
          result: f.result.trim(),
          isLive: !!f.isLive
        })
      );

      await this.store.refreshFixtures(tournamentId);
      this.addOpen.set(false);
    } catch {
      this.error.set('Failed to add fixture.');
    } finally {
      this.saving.set(false);
    }
  }

  private toApiDate(raw: string): string {
    const value = (raw ?? '').trim();
    if (!value) return '';

    // Native `<input type="date">` uses `YYYY-MM-DD`.
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    // Already in `DD/MM/YYYY` (or close enough).
    return value;
  }

  private toApiTime(raw: string): string {
    const value = (raw ?? '').trim();
    if (!value) return '';

    // Native `<input type="time">` uses `HH:MM` (24h).
    const t = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!t) return value;

    let hours = Number(t[1]);
    const minutes = t[2];
    if (!Number.isFinite(hours)) return value;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes} ${ampm}`;
  }
}
