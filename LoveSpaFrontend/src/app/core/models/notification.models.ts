export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Alert';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string | null;
  entityId?: number | null;
  isRead: boolean;
  readAtUtc?: string | null;
  createdAtUtc: string;
}

export interface NotificationUnreadCountResponse {
  count: number;
}
