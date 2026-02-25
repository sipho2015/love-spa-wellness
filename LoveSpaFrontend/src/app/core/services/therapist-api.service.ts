import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SaveTherapistRequest, Therapist } from '../models/therapist.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class TherapistApiService {
  private readonly endpoint = `${API_BASE_URL}/therapists`;

  constructor(private readonly http: HttpClient) {}

  getAll(onlyAvailable = false): Observable<Therapist[]> {
    const params = new HttpParams().set('onlyAvailable', String(onlyAvailable));
    return this.http.get<Therapist[]>(this.endpoint, { params });
  }

  getById(id: number): Observable<Therapist> {
    return this.http.get<Therapist>(`${this.endpoint}/${id}`);
  }

  create(payload: SaveTherapistRequest): Observable<Therapist> {
    return this.http.post<Therapist>(this.endpoint, payload);
  }

  update(id: number, payload: SaveTherapistRequest): Observable<Therapist> {
    return this.http.put<Therapist>(`${this.endpoint}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
