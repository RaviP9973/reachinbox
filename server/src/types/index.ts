export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  senderEmail: string;
  scheduledAt: string; // ISO date string
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  recipients: string[]; // Parsed from CSV or direct input
}

export interface EmailResponse {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  previewUrl: string | null;
  batchId: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  processing: number;
}
