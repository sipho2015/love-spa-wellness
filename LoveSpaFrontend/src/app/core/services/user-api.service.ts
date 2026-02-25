import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../models/auth.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly endpoint = `${API_BASE_URL}/users`;

  constructor(private readonly http: HttpClient) {}

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.endpoint}/me`);
  }

  getAll(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(this.endpoint);
  }
}
