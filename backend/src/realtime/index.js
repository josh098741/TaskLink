/**
 * realtime/index.js
 * ─────────────────
 * Singleton wiring for chat realtime. Creates the in-process hub, attaches
 * the Upstash Redis client when configured, and starts the single
 * cross-instance bridge — so both the WebSocket server (ws/server.js) and the
 * REST chat controller (chatController.js) share one event bus.
 */

import { Redis } from "@upstash/redis";
import { createHub } from "./hub.js";
import { env } from "../utils/env.js";

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export const hub = createHub(redis);

// One bridge per process; idempotent internally.
hub.startBridge();

export { redis };