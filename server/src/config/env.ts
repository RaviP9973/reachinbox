import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),

  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || "reachinbox-jwt-secret",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    minDelayBetweenSendsMs: parseInt(process.env.MIN_DELAY_BETWEEN_SENDS_MS || "2000", 10),
    maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "200", 10),
  },

  ethereal: {
    email: process.env.ETHEREAL_EMAIL || "auto",
    password: process.env.ETHEREAL_PASSWORD || "auto",
  },
} as const;
