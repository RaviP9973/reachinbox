import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/env";
import authRoutes from "./routes/auth.routes";
import emailRoutes from "./routes/email.routes";
import { startEmailWorker } from "./workers/email.worker";
import { getTransporter } from "./lib/mailer";
import prisma from "./lib/prisma";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log("✅ Database connected");

    // Initialize Ethereal SMTP transporter
    await getTransporter();

    // Start BullMQ worker
    startEmailWorker();

    // Start Express server
    app.listen(config.port, () => {
      console.log(`🚀 Server running at http://localhost:${config.port}`);
      console.log(`   Health: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
