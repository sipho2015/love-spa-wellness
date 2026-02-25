import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SavePackageRequest, SpaPackage } from '../models/package.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class SpaPackagesApiService {
  private readonly endpoint = `${API_BASE_URL}/packages`;

  constructor(private readonly http: HttpClient) {}

  getAll(onlyActive = false): Observable<SpaPackage[]> {
    return this.http.get<SpaPackage[]>(this.endpoint, {
      params: { onlyActive }
    });
  }

  getById(id: number): Observable<SpaPackage> {
    return this.http.get<SpaPackage>(`${this.endpoint}/${id}`);
  }

  create(payload: SavePackageRequest): Observable<SpaPackage> {
    return this.http.post<SpaPackage>(this.endpoint, payload);
  }

  update(id: number, payload: SavePackageRequest): Observable<SpaPackage> {
    return this.http.put<SpaPackage>(`${this.endpoint}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
