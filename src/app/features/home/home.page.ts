import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {
  private readonly store = inject(AppStoreService);
  readonly tournaments = this.store.tournaments;
  readonly footballOnly = computed(() =>
    this.tournaments().filter((t) => t.sportType.toLowerCase() === 'football')
  );

  readonly ordered = computed(() =>
    [...this.footballOnly()].sort((a, b) => (b.startDateIso ?? '').localeCompare(a.startDateIso ?? ''))
  );

  constructor() {
    void this.store.ensureTournamentsLoaded();
  }
}
