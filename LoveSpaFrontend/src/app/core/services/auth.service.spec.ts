import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthResponse } from '../models/auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should store session after successful login', () => {
    const mockResponse: AuthResponse = {
      token: 'mock-token',
      expiresAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: {
        id: 1,
        fullName: 'Jane Customer',
        email: 'jane@lovespa.com',
        role: 'Customer'
      }
    };

    service.login({ email: 'jane@lovespa.com', password: 'Password123!' }).subscribe((session) => {
      expect(session.token).toBe('mock-token');
    });

    const req = httpMock.expectOne('/api/users/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser?.email).toBe('jane@lovespa.com');
  });
});
