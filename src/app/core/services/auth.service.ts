import { computed, Injectable, signal } from '@angular/core';
import { Role } from '../models/role';

const STORAGE_KEY = 'sf_role';

function readRoleFromStorage(): Role {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'admin' ? 'admin' : 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _role = signal<Role>(readRoleFromStorage());

  readonly role = this._role.asReadonly();
  readonly isAdmin = computed(() => this._role() === 'admin');

  setRole(role: Role): void {
    this._role.set(role);
    localStorage.setItem(STORAGE_KEY, role);
  }
}

