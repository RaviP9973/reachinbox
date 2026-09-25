export interface EmailResponse {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";
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

export interface ScheduleResult {
  message: string;
  batchId: string;
  totalScheduled: number;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}
