import Redis from "ioredis";
import { config } from "../config/env";

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null, // Required by BullMQ
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log(`✅ Redis connected at ${config.redis.host}:${config.redis.port}`);
});

export const createRedisConnection = () =>
  new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
