import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SiteProfile } from '../models/site-profile.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class SiteProfileApiService {
  private readonly endpoint = `${API_BASE_URL}/public/site-profile`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<SiteProfile> {
    return this.http.get<SiteProfile>(this.endpoint);
  }
}
