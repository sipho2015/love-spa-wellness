import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AuthModalMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
}

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private readonly stateSubject = new BehaviorSubject<AuthModalState>({
    isOpen: false,
    mode: 'login'
  });

  readonly state$ = this.stateSubject.asObservable();

  get currentState(): AuthModalState {
    return this.stateSubject.value;
  }

  open(mode: AuthModalMode = 'login'): void {
    this.stateSubject.next({ isOpen: true, mode });
  }

  close(): void {
    this.stateSubject.next({ isOpen: false, mode: this.currentState.mode });
  }

  setMode(mode: AuthModalMode): void {
    this.stateSubject.next({ isOpen: true, mode });
  }
}
