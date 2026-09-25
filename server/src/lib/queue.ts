import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 5000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

emailQueue.on("error", (err) => {
  console.error("Email queue error:", err.message);
});

export interface EmailJobData {
  emailId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  userId: string;
}
