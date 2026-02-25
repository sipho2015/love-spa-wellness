import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Appointment,
  AppointmentAvailability,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest
} from '../models/appointment.models';
import { API_BASE_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class AppointmentApiService {
  private readonly endpoint = `${API_BASE_URL}/appointments`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.endpoint);
  }

  getMyBookings(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.endpoint}/my`);
  }

  getStaffSchedule(therapistId?: number): Observable<Appointment[]> {
    let params = new HttpParams();
    if (therapistId !== undefined) {
      params = params.set('therapistId', therapistId.toString());
    }

    return this.http.get<Appointment[]>(`${this.endpoint}/staff/schedule`, { params });
  }

  getAvailability(payload: {
    therapistId: number;
    appointmentDate: string;
    durationMinutes: number;
  }): Observable<AppointmentAvailability> {
    const params = new HttpParams()
      .set('therapistId', payload.therapistId)
      .set('appointmentDate', payload.appointmentDate)
      .set('durationMinutes', payload.durationMinutes);

    return this.http.get<AppointmentAvailability>(`${this.endpoint}/availability`, { params });
  }

  create(payload: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.endpoint, payload);
  }

  update(id: number, payload: UpdateAppointmentRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.endpoint}/${id}`, payload);
  }

  updateStatus(id: number, payload: UpdateAppointmentStatusRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.endpoint}/${id}/status`, payload);
  }

  reschedule(id: number, payload: RescheduleAppointmentRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.endpoint}/${id}/reschedule`, payload);
  }

  cancel(id: number): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.endpoint}/${id}/cancel`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
