import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { tournamentGuard } from './core/guards/tournament.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePageComponent)
  },
  {
    path: 't/:tournamentId',
    canActivate: [tournamentGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPageComponent)
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams.page').then((m) => m.TeamsPageComponent)
      },
      {
        path: 'teams/:teamId',
        loadComponent: () =>
          import('./features/teams/team-detail.page').then((m) => m.TeamDetailPageComponent)
      },
      {
        path: 'fixtures',
        loadComponent: () =>
          import('./features/fixtures/fixtures.page').then((m) => m.FixturesPageComponent)
      },
      {
        path: 'matches/:matchId',
        loadComponent: () =>
          import('./features/match/match.page').then((m) => m.MatchPageComponent)
      },
      {
        path: 'admin/scoring',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/scoring-console.page').then((m) => m.ScoringConsolePageComponent)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: '' }
];
