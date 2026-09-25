import prisma from "../lib/prisma";
import { emailQueue, EmailJobData } from "../lib/queue";
import { config } from "../config/env";
import { EmailStatus } from "@prisma/client";
import type { ScheduleEmailRequest, EmailResponse, PaginatedResponse, EmailStats } from "../types";

/**
 * Parse email addresses from CSV content.
 * Supports formats:
 *   - One email per line
 *   - Comma-separated
 *   - CSV with "email" header column
 */
export function parseEmailsFromCSV(content: string): string[] {
  const lines = content
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const emails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const startIndex = firstLine.includes("email") || firstLine.includes("e-mail") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]+/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    for (const part of parts) {
      if (emailRegex.test(part)) {
        emails.push(part.toLowerCase());
      }
    }
  }

  // Deduplicate
  return [...new Set(emails)];
}

/**
 * Schedule a batch of emails.
 * Creates DB records and enqueues BullMQ delayed jobs.
 */
export async function scheduleEmails(
  userId: string,
  request: ScheduleEmailRequest
): Promise<{ batchId: string; totalScheduled: number }> {
  const batchId = crypto.randomUUID();
  const scheduledAt = new Date(request.scheduledAt);
  const now = new Date();
  const delayMs = request.delayBetweenEmailsMs || config.worker.minDelayBetweenSendsMs;
  const hourlyLimit = request.hourlyLimit || config.worker.maxEmailsPerHourPerSender;

  // Pre-stagger: distribute emails across hour windows to respect rate limits
  const emailRecords = request.recipients.map((recipientEmail, index) => {
    // Calculate which hour window this email falls into
    const emailsPerHour = Math.min(hourlyLimit, Math.floor(3_600_000 / delayMs));
    const hourWindow = Math.floor(index / emailsPerHour);
    const positionInWindow = index % emailsPerHour;

    // Offset: hourWindow * 1 hour + position * delay
    const offsetMs = hourWindow * 3_600_000 + positionInWindow * delayMs;
    const emailScheduledAt = new Date(scheduledAt.getTime() + offsetMs);

    return {
      id: crypto.randomUUID(),
      userId,
      recipientEmail,
      subject: request.subject,
      body: request.body,
      senderEmail: request.senderEmail,
      status: EmailStatus.SCHEDULED,
      scheduledAt: emailScheduledAt,
      batchId,
    };
  });

  // Batch insert into database
  await prisma.email.createMany({
    data: emailRecords,
  });

  // Enqueue BullMQ delayed jobs
  const jobs = emailRecords.map((record) => {
    const delay = Math.max(record.scheduledAt.getTime() - now.getTime(), 0);
    const jobData: EmailJobData = {
      emailId: record.id,
      recipientEmail: record.recipientEmail,
      subject: record.subject,
      body: record.body,
      senderEmail: record.senderEmail,
      userId,
    };

    return {
      name: "send-email",
      data: jobData,
      opts: {
        delay,
        jobId: record.id, // Ensures idempotency — same email can't be enqueued twice
      },
    };
  });

  // BullMQ supports bulk adding
  await emailQueue.addBulk(jobs);

  return { batchId, totalScheduled: emailRecords.length };
}

/**
 * List emails with pagination and filtering.
 */
export async function listEmails(
  userId: string,
  status: EmailStatus | undefined,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<EmailResponse>> {
  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.email.count({ where }),
  ]);

  return {
    data: emails.map(emailToResponse),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get email stats for the dashboard.
 */
export async function getEmailStats(userId: string): Promise<EmailStats> {
  const [scheduled, sent, failed, processing] = await Promise.all([
    prisma.email.count({ where: { userId, status: EmailStatus.SCHEDULED } }),
    prisma.email.count({ where: { userId, status: EmailStatus.SENT } }),
    prisma.email.count({ where: { userId, status: EmailStatus.FAILED } }),
    prisma.email.count({ where: { userId, status: EmailStatus.PROCESSING } }),
  ]);

  return { scheduled, sent, failed, processing };
}

function emailToResponse(email: any): EmailResponse {
  return {
    id: email.id,
    recipientEmail: email.recipientEmail,
    subject: email.subject,
    body: email.body,
    senderEmail: email.senderEmail,
    status: email.status,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt?.toISOString() || null,
    failedAt: email.failedAt?.toISOString() || null,
    errorMessage: email.errorMessage || null,
    previewUrl: email.previewUrl || null,
    batchId: email.batchId || null,
    createdAt: email.createdAt.toISOString(),
  };
}
