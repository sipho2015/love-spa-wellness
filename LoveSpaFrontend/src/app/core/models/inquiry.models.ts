export interface CreateInquiryRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
}

export type InquiryStatus = 'Pending' | 'Handled';

export interface Inquiry {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
  status: InquiryStatus;
  lastReplySubject?: string | null;
  adminNotes?: string | null;
  respondedAtUtc?: string | null;
  createdAtUtc: string;
}

export interface UpdateInquiryStatusRequest {
  status: InquiryStatus;
  adminNotes?: string | null;
}

export interface ReplyToInquiryRequest {
  subject: string;
  body: string;
  adminNotes?: string | null;
  markAsHandled?: boolean;
}
