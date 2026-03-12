import { Injectable } from '@angular/core';
import { Tournament } from '../models/tournament';

function normalizeMobile(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

function adminStorageKey(tournamentId: number): string {
  return `sf_admin_mobile_${tournamentId}`;
}

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  hasAccess(tournament: Tournament): boolean {
    const saved = sessionStorage.getItem(adminStorageKey(tournament.id));
    if (!saved) return false;
    const savedNorm = normalizeMobile(saved);
    return tournament.admins.some((a) => normalizeMobile(a) === savedNorm);
  }

  grantIfAdmin(tournament: Tournament, mobile: string): boolean {
    const mobileNorm = normalizeMobile(mobile);
    if (!mobileNorm) return false;
    const ok = tournament.admins.some((a) => normalizeMobile(a) === mobileNorm);
    if (!ok) return false;

    sessionStorage.setItem(adminStorageKey(tournament.id), mobileNorm);
    return true;
  }

  clear(tournamentId: number): void {
    sessionStorage.removeItem(adminStorageKey(tournamentId));
  }
}

