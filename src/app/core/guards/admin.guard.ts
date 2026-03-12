import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAccessService } from '../services/admin-access.service';
import { AppStoreService } from '../services/app-store.service';

export const adminGuard: CanActivateFn = async () => {
  const store = inject(AppStoreService);
  const adminAccess = inject(AdminAccessService);
  const router = inject(Router);

  await store.ensureTournamentsLoaded();
  const tournament = store.selectedTournament();
  if (!tournament) return router.createUrlTree(['/']);

  if (adminAccess.hasAccess(tournament)) return true;

  return router.createUrlTree(['/t', tournament.id, 'dashboard'], { queryParams: { admin: '1' } });
};
