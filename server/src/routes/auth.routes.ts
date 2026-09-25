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
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "Missing Google credential token" });
      return;
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.auth.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
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

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      config.auth.jwtSecret,
      { expiresIn: "7d" }
    );

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
    console.error("Google auth error:", error.message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
