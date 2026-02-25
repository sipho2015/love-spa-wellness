import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserProfile,
  UserRole
} from '../models/auth.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'love_spa_auth_session';
  private readonly authStateSubject = new BehaviorSubject<AuthResponse | null>(null);
  readonly authState$ = this.authStateSubject.asObservable();
  readonly user$ = this.authState$.pipe(map((session) => session?.user ?? null));

  constructor(private readonly http: HttpClient) {
    this.restoreSession();
  }

  get token(): string | null {
    const session = this.authStateSubject.value;
    if (!session) {
      return null;
    }

    const expiresAtMs = Date.parse(session.expiresAtUtc);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      this.logout();
      return null;
    }

    return session.token;
  }

  get currentUser(): UserProfile | null {
    return this.authStateSubject.value?.user ?? null;
  }

  get currentRole(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentRole === role;
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/users/login`, payload)
      .pipe(tap((session) => this.saveSession(session)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/users/register`, payload)
      .pipe(tap((session) => this.saveSession(session)));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${API_BASE_URL}/users/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE_URL}/users/reset-password`, payload);
  }

  logout(): void {
    this.authStateSubject.next(null);
    localStorage.removeItem(this.storageKey);
  }

  private saveSession(session: AuthResponse): void {
    this.authStateSubject.next(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private restoreSession(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const session = JSON.parse(raw) as AuthResponse;
      const expiresAtMs = Date.parse(session.expiresAtUtc);
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        localStorage.removeItem(this.storageKey);
        return;
      }

      this.authStateSubject.next(session);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
}
