import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SpaService, SaveServiceRequest } from '../models/service.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class SpaServicesApiService {
  private readonly endpoint = `${API_BASE_URL}/services`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<SpaService[]> {
    return this.http.get<SpaService[]>(this.endpoint);
  }

  getById(id: number): Observable<SpaService> {
    return this.http.get<SpaService>(`${this.endpoint}/${id}`);
  }

  create(payload: SaveServiceRequest): Observable<SpaService> {
    return this.http.post<SpaService>(this.endpoint, payload);
  }

  update(id: number, payload: SaveServiceRequest): Observable<SpaService> {
    return this.http.put<SpaService>(`${this.endpoint}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
