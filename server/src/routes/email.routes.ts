import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  scheduleEmails,
  listEmails,
  getEmailStats,
  parseEmailsFromCSV,
} from "../services/email.service";
import { EmailStatus } from "@prisma/client";

const router = Router();

// Multer for CSV file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".txt")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and text files are allowed"));
    }
  },
});

// Validation schema
const scheduleSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  senderEmail: z.string().email("Invalid sender email"),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  delayBetweenEmailsMs: z.coerce.number().min(1000).default(2000),
  hourlyLimit: z.coerce.number().min(1).max(1000).default(200),
  recipients: z.array(z.string().email()).optional(),
});

/**
 * POST /api/emails/schedule
 * Schedule a batch of emails. Accepts multipart form with optional CSV file.
 */
router.post(
  "/schedule",
  authMiddleware,
  upload.single("csvFile"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Parse JSON fields from form data
      const rawBody: any = {
        subject: req.body.subject,
        body: req.body.body,
        senderEmail: req.body.senderEmail,
        scheduledAt: req.body.scheduledAt,
        delayBetweenEmailsMs: req.body.delayBetweenEmailsMs,
        hourlyLimit: req.body.hourlyLimit,
      };

      // Parse recipients from CSV file or JSON field
      let recipients: string[] = [];

      if (req.file) {
        const csvContent = req.file.buffer.toString("utf-8");
        recipients = parseEmailsFromCSV(csvContent);
      }

      if (req.body.recipients) {
        const parsed =
          typeof req.body.recipients === "string"
            ? JSON.parse(req.body.recipients)
            : req.body.recipients;
        if (Array.isArray(parsed)) {
          recipients = [...recipients, ...parsed];
        }
      }

      // Deduplicate recipients
      recipients = [...new Set(recipients)];

      if (recipients.length === 0) {
        res.status(400).json({ error: "No valid email recipients provided" });
        return;
      }

      rawBody.recipients = recipients;

      const validated = scheduleSchema.parse(rawBody);

      const result = await scheduleEmails(req.user!.userId, {
        ...validated,
        recipients,
      });

      res.status(201).json({
        message: `Successfully scheduled ${result.totalScheduled} emails`,
        batchId: result.batchId,
        totalScheduled: result.totalScheduled,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validation failed", details: error.errors });
        return;
      }
      console.error("Schedule error:", error);
      res.status(500).json({ error: "Failed to schedule emails" });
    }
  }
);

/**
 * GET /api/emails
 * List emails with pagination. Query params: status, page, pageSize
 */
router.get("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    let emailStatus: EmailStatus | undefined;
    if (status) {
      const upperStatus = status.toUpperCase();
      if (Object.values(EmailStatus).includes(upperStatus as EmailStatus)) {
        emailStatus = upperStatus as EmailStatus;
      }
    }

    const result = await listEmails(req.user!.userId, emailStatus, page, pageSize);
    res.json(result);
  } catch (error: any) {
    console.error("List emails error:", error);
    res.status(500).json({ error: "Failed to list emails" });
  }
});

/**
 * GET /api/emails/stats
 * Get email statistics for dashboard.
 */
router.get("/stats", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getEmailStats(req.user!.userId);
    res.json(stats);
  } catch (error: any) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
