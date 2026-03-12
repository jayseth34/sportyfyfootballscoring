import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStoreService } from '../services/app-store.service';

export const tournamentGuard: CanActivateFn = async (route) => {
  const store = inject(AppStoreService);
  const router = inject(Router);

  await store.ensureTournamentsLoaded();

  const rawId = route.paramMap.get('tournamentId') ?? '';
  const tournamentId = Number(rawId);
  if (!Number.isFinite(tournamentId)) return router.createUrlTree(['/']);
  if (!store.getTournamentById(tournamentId)) return router.createUrlTree(['/']);

  store.selectTournament(tournamentId);
  await store.ensureFixturesLoaded(tournamentId);
  await store.ensureTeamsLoaded(tournamentId);
  return true;
};
