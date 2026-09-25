import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { config } from "../config/env";

const router = Router();
const googleClient = new OAuth2Client(config.auth.googleClientId);

/**
 * POST /api/auth/google
 * Verify Google ID token, upsert user, return JWT
 */
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  console.log("---- BACKEND AUTH DEBUG START ----");
  console.log("Received POST /api/auth/google");
  try {
    const { credential } = req.body;

    if (!credential) {
      console.error("Error: Missing Google credential token in request body");
      res.status(400).json({ error: "Missing Google credential token" });
      return;
    }

    console.log("Google Client ID configured as:", config.auth.googleClientId ? "Set (starts with " + config.auth.googleClientId.substring(0, 10) + "...)" : "MISSING!");

    // Verify the Google ID token
    let ticket;
    try {
      console.log("Attempting to verify ID token with Google...");
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.auth.googleClientId,
      });
      console.log("Google token verified successfully!");
    } catch (verifyError: any) {
      console.error("Failed to verify Google token:", verifyError.message);
      res.status(400).json({ error: "Invalid Google token structure/signature" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      console.error("Payload or email missing from verified token");
      res.status(400).json({ error: "Invalid Google token payload" });
      return;
    }
    
    console.log(`Token belongs to email: ${payload.email}`);

    // Upsert user in database
    console.log("Attempting database upsert...");
    let user;
    try {
      user = await prisma.user.upsert({
        where: { email: payload.email },
        update: {
          name: payload.name || null,
          avatar: payload.picture || null,
        },
        create: {
          email: payload.email,
          name: payload.name || null,
          avatar: payload.picture || null,
        },
      });
      console.log(`Database upsert successful for user ID: ${user.id}`);
    } catch (dbError: any) {
      console.error("Database upsert failed! Error:", dbError.message);
      res.status(500).json({ error: "Database operation failed during login" });
      return;
    }

    // Generate JWT
    console.log("Generating JWT...");
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      config.auth.jwtSecret,
      { expiresIn: "7d" }
    );
    console.log("JWT generated successfully. Returning 200 OK.");

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error("Catch-all Google auth error:", error.message || error);
    res.status(500).json({ error: "Authentication failed" });
  } finally {
    console.log("---- BACKEND AUTH DEBUG END ----");
  }
});

export default router;
