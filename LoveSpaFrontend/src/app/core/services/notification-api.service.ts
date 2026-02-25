import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppNotification, NotificationUnreadCountResponse } from '../models/notification.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly endpoint = `${API_BASE_URL}/notifications`;

  constructor(private readonly http: HttpClient) {}

  getMy(unreadOnly = false, take = 40): Observable<AppNotification[]> {
    const params = new HttpParams()
      .set('unreadOnly', unreadOnly)
      .set('take', Math.max(1, Math.min(100, take)));

    return this.http.get<AppNotification[]>(this.endpoint, { params });
  }

  getUnreadCount(): Observable<NotificationUnreadCountResponse> {
    return this.http.get<NotificationUnreadCountResponse>(`${this.endpoint}/unread-count`);
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.endpoint}/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.endpoint}/read-all`, {});
  }
}
