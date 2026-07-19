/**
 * Watch Token — short-lived signed tokens for video playback.
 *
 * Flow:
 *   1. Authenticated user requests GET /api/media/:id/watch-token
 *   2. Backend verifies session, generates a signed token (15 min TTL)
 *   3. Frontend uses this token in the player request
 *   4. Before serving the stream URL, backend verifies the token
 *
 * This prevents sharing/scraping the streaming URL directly.
 */

import crypto from "crypto";
import { env } from "../config/env";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface WatchTokenPayload {
  userId: string;
  mediaId: string;
  exp: number; // Unix ms
}

function sign(payload: WatchTokenPayload): string {
  const data = JSON.stringify(payload);
  const hmac = crypto
    .createHmac("sha256", env.watchTokenSecret)
    .update(data)
    .digest("hex");
  const encoded = Buffer.from(data).toString("base64url");
  return `${encoded}.${hmac}`;
}

function verify(token: string): WatchTokenPayload | null {
  try {
    const [encoded, hmac] = token.split(".");
    if (!encoded || !hmac) return null;

    const data = Buffer.from(encoded, "base64url").toString("utf8");
    const expectedHmac = crypto
      .createHmac("sha256", env.watchTokenSecret)
      .update(data)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const hmacBuffer = Buffer.from(hmac, "hex");
    const expectedBuffer = Buffer.from(expectedHmac, "hex");
    if (
      hmacBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(hmacBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload: WatchTokenPayload = JSON.parse(data);
    if (Date.now() > payload.exp) return null; // expired

    return payload;
  } catch {
    return null;
  }
}

export function generateWatchToken(userId: string, mediaId: string): string {
  return sign({
    userId,
    mediaId,
    exp: Date.now() + TOKEN_TTL_MS,
  });
}

export function verifyWatchToken(
  token: string,
  userId: string,
  mediaId: string,
): boolean {
  const payload = verify(token);
  if (!payload) return false;
  return payload.userId === userId && payload.mediaId === mediaId;
}
