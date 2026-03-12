import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStoreService } from '../../core/services/app-store.service';
import { Fixture } from '../../core/models/fixture';

@Component({
  selector: 'app-fixtures-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './fixtures.page.html',
  styleUrl: './fixtures.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixturesPageComponent {
  private readonly store = inject(AppStoreService);
  readonly tournamentId = this.store.selectedTournamentIdRequired;
  readonly fixtures = this.store.fixtures;

  readonly ordered = computed(() => [...this.fixtures()].sort((a, b) => b.id - a.id));

  constructor() {
    void this.store.ensureFixturesLoaded(this.tournamentId());
  }

  statusLabel(f: Fixture): string {
    if (f.isLive) return 'LIVE';
    if (f.status && f.status.trim().length) return f.status.toUpperCase();
    return 'SCHEDULED';
  }
}
