import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { EMAIL_QUEUE_NAME, EmailJobData } from "../lib/queue";
import { sendEmail } from "../lib/mailer";
import { checkRateLimit } from "../services/rateLimit.service";
import prisma from "../lib/prisma";
import { config } from "../config/env";
import { EmailStatus } from "@prisma/client";

/**
 * BullMQ Worker for processing email send jobs.
 *
 * Features:
 * - Configurable concurrency (WORKER_CONCURRENCY)
 * - Per-sender rate limiting via Redis counters (Lua script)
 * - Minimum delay between sends (BullMQ rate limiter)
 * - Idempotency: checks DB status before sending
 * - Updates DB with sent/failed status + Ethereal preview URL
 * - On rate limit exceeded: reschedules job to next hour window
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId, recipientEmail, subject, body, senderEmail } = job.data;

  console.log(`📨 Processing job ${job.id} → ${recipientEmail}`);

  // 1. Idempotency check: ensure email hasn't already been sent
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    console.log(`⚠️ Email ${emailId} not found in DB, skipping`);
    return;
  }
  if (email.status === EmailStatus.SENT) {
    console.log(`⚠️ Email ${emailId} already sent, skipping (idempotency)`);
    return;
  }

  // 2. Per-sender rate limit check
  const rateCheck = await checkRateLimit(senderEmail);
  if (!rateCheck.allowed) {
    console.log(
      `⏳ Rate limit exceeded for ${senderEmail}, rescheduling in ${rateCheck.retryAfterMs}ms`
    );
    // Move job to delayed state — it will be processed in the next hour window
    // Add a small buffer (1 second) to ensure we're in the next window
    await job.moveToDelayed(Date.now() + rateCheck.retryAfterMs + 1000, job.token);
    // Throw a specific error so BullMQ knows the job was not completed
    throw new Error(`RATE_LIMITED:${rateCheck.retryAfterMs}`);
  }

  // 3. Mark as processing
  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.PROCESSING,
      bullJobId: job.id?.toString() || null,
    },
  });

  try {
    // 4. Send email via Ethereal
    const result = await sendEmail({
      from: senderEmail,
      to: recipientEmail,
      subject,
      html: body,
    });

    // 5. Mark as sent
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        previewUrl: result.previewUrl ? String(result.previewUrl) : null,
      },
    });

    console.log(
      `✅ Email sent to ${recipientEmail} | Preview: ${result.previewUrl || "N/A"}`
    );
  } catch (error: any) {
    // 6. Mark as failed
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.FAILED,
        failedAt: new Date(),
        errorMessage: error.message?.substring(0, 500) || "Unknown error",
      },
    });

    console.error(`❌ Failed to send email to ${recipientEmail}:`, error.message);
    throw error; // Rethrow to trigger BullMQ retry
  }
}

export function startEmailWorker(): Worker {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: config.worker.concurrency,
    limiter: {
      max: 1,
      duration: config.worker.minDelayBetweenSendsMs, // Min 2s between sends
    },
  });

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    // Don't log rate limit errors as failures — they're expected rescheduling
    if (err.message.startsWith("RATE_LIMITED:")) {
      return;
    }
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err.message);
  });

  console.log(
    `🔧 Email worker started (concurrency: ${config.worker.concurrency}, ` +
    `min delay: ${config.worker.minDelayBetweenSendsMs}ms, ` +
    `max/hour/sender: ${config.worker.maxEmailsPerHourPerSender})`
  );

  return worker;
}
