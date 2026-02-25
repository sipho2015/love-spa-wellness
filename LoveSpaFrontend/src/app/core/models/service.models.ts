export interface SpaService {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface SaveServiceRequest {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}
