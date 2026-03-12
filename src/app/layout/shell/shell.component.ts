import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AdminAccessService } from '../../core/services/admin-access.service';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  private readonly store = inject(AppStoreService);
  private readonly adminAccess = inject(AdminAccessService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tournamentId = computed(() => this.store.selectedTournamentId() ?? 0);
  readonly tournament = this.store.selectedTournament;
  readonly isAdmin = computed(() => {
    const t = this.tournament();
    return t ? this.adminAccess.hasAccess(t) : false;
  });

  readonly adminModalOpen = signal(false);
  readonly mobile = signal('');
  readonly error = signal<string | null>(null);

  private readonly openAdminQuery = toSignal(
    this.route.queryParamMap.pipe(map((q) => (q.get('admin') === '1' ? true : false))),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      if (!this.openAdminQuery()) return;
      this.openAdminModal();

      void this.router.navigate([], {
        queryParams: { admin: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    effect(() => {
      // Switching tournaments should not keep any prior modal/error state.
      this.tournamentId();
      this.adminModalOpen.set(false);
      this.error.set(null);
      this.mobile.set('');
    });
  }

  leaveTournament(): void {
    this.store.clearTournament();
  }

  openScoring(): void {
    const t = this.tournament();
    if (!t) return;

    if (this.adminAccess.hasAccess(t)) {
      void this.router.navigate(['/t', t.id, 'admin', 'scoring']);
      return;
    }

    this.openAdminModal();
  }

  openAdminModal(): void {
    this.error.set(null);
    this.mobile.set('');
    this.adminModalOpen.set(true);
  }

  closeAdminModal(): void {
    this.adminModalOpen.set(false);
  }

  revokeAdminAccess(): void {
    const t = this.tournament();
    if (!t) return;
    this.adminAccess.clear(t.id);
    this.adminModalOpen.set(false);
    this.error.set(null);
    this.mobile.set('');
  }

  submitAdminMobile(): void {
    const t = this.tournament();
    if (!t) return;

    const ok = this.adminAccess.grantIfAdmin(t, this.mobile());
    if (!ok) {
      this.error.set('Not an admin for this tournament.');
      return;
    }

    this.adminModalOpen.set(false);
    void this.router.navigate(['/t', t.id, 'admin', 'scoring']);
  }
}
