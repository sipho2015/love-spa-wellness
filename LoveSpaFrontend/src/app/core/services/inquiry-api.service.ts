import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateInquiryRequest,
  Inquiry,
  ReplyToInquiryRequest,
  UpdateInquiryStatusRequest
} from '../models/inquiry.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class InquiryApiService {
  private readonly endpoint = `${API_BASE_URL}/inquiries`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Inquiry[]> {
    return this.http.get<Inquiry[]>(this.endpoint);
  }

  create(payload: CreateInquiryRequest): Observable<Inquiry> {
    return this.http.post<Inquiry>(this.endpoint, payload);
  }

  updateStatus(id: number, payload: UpdateInquiryStatusRequest): Observable<Inquiry> {
    return this.http.patch<Inquiry>(`${this.endpoint}/${id}/status`, payload);
  }

  reply(id: number, payload: ReplyToInquiryRequest): Observable<Inquiry> {
    return this.http.post<Inquiry>(`${this.endpoint}/${id}/reply`, payload);
  }
}
