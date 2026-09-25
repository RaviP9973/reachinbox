import { redis } from "../lib/redis";
import { config } from "../config/env";

/**
 * Redis-backed per-sender hourly rate limiting using Lua scripts for atomicity.
 *
 * Key pattern: ratelimit:{senderEmail}:{hourBucket}
 * where hourBucket = Math.floor(timestamp / 3600000)
 *
 * The Lua script atomically:
 * 1. Gets the current count for the sender in this hour window
 * 2. If under limit, increments and returns allowed=true
 * 3. If at/over limit, returns allowed=false with retry timing
 */

const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
  current = 0
else
  current = tonumber(current)
end

if current < limit then
  redis.call('INCR', key)
  if current == 0 then
    redis.call('EXPIRE', key, ttl)
  end
  return {1, limit - current - 1}
else
  local remaining_ttl = redis.call('TTL', key)
  return {0, remaining_ttl}
end
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a sender can send an email in the current hour window.
 * Uses Redis Lua script for atomic check-and-increment.
 */
export async function checkRateLimit(
  senderEmail: string,
  maxPerHour?: number
): Promise<RateLimitResult> {
  const limit = maxPerHour || config.worker.maxEmailsPerHourPerSender;
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:${senderEmail}:${hourBucket}`;
  const ttl = 3600; // 1 hour TTL

  const result = (await redis.eval(
    RATE_LIMIT_LUA_SCRIPT,
    1,
    key,
    limit.toString(),
    ttl.toString()
  )) as [number, number];

  if (result[0] === 1) {
    return {
      allowed: true,
      remaining: result[1],
      retryAfterMs: 0,
    };
  } else {
    // result[1] is the remaining TTL in seconds
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: result[1] * 1000,
    };
  }
}

/**
 * Get current usage count for a sender in the current hour.
 */
export async function getCurrentUsage(senderEmail: string): Promise<number> {
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:${senderEmail}:${hourBucket}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}
