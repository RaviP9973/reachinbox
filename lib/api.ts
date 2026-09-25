import type {
  EmailResponse,
  PaginatedResponse,
  EmailStats,
  ScheduleResult,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData (browser sets multipart boundary)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Email APIs
  async getEmails(
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<EmailResponse>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set("status", status);
    return this.request(`/api/emails?${params}`);
  }

  async getStats(): Promise<EmailStats> {
    return this.request("/api/emails/stats");
  }

  async scheduleEmails(formData: FormData): Promise<ScheduleResult> {
    return this.request("/api/emails/schedule", {
      method: "POST",
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
