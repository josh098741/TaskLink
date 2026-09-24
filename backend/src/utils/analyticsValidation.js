/**
 * analyticsValidation.js
 * ──────────────────────
 * Pure validation + calculation helpers for the session analytics endpoint
 * (POST /api/analytics/session). No DB, no request objects — unit-testable
 * with node:test, matching chatValidation.js.
 *
 * Trust model: all timestamps come from the device clock. Both startedAt and
 * endedAt are taken from the same clock, so their difference is skew-safe;
 * the server still clamps everything into sane bounds so a hostile or buggy
 * client cannot write absurd rows (negative durations, year-3000 end times,
 * 400-day sessions).
 */

export const SESSION_ACTIONS = ["start", "heartbeat", "end"];

/** Hard ceiling for a single recorded session (seconds) — 24 hours. */
export const MAX_SESSION_SECONDS = 86400;

/** Heartbeats closer together than this are treated as duplicates. */
export const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

const MAX_SESSION_ID_LENGTH = 64;
const MAX_PLATFORM_LENGTH = 16;
const MAX_APP_VERSION_LENGTH = 32;
const ALLOWED_PLATFORMS = ["android", "ios", "web"];

/**
 * parseIsoDate
 * Parses an ISO timestamp string into a Date.
 *
 * @param {unknown} raw
 * @returns {Date|null} null when raw is null/undefined (optional field).
 * @throws {Error} When present but not a valid date.
 */
function parseIsoDate(raw) {
  if (raw == null || raw === "") return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Timestamp must be a valid ISO date string.");
  }
  return parsed;
}

/**
 * validateSessionReport
 * Validates and normalises the body of POST /api/analytics/session.
 *
 * @param {unknown} body - Raw request body.
 * @returns {{
 *   action: "start"|"heartbeat"|"end",
 *   sessionId: string,
 *   startedAt: Date,
 *   endedAt: Date|null,
 *   platform: string|null,
 *   appVersion: string|null,
 * }}
 * @throws {Error} With a client-safe message when anything is invalid.
 */
export function validateSessionReport(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!SESSION_ACTIONS.includes(action)) {
    throw new Error(`action must be one of: ${SESSION_ACTIONS.join(", ")}.`);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    throw new Error("sessionId is required.");
  }
  if (sessionId.length > MAX_SESSION_ID_LENGTH) {
    throw new Error(`sessionId is too long (max ${MAX_SESSION_ID_LENGTH} characters).`);
  }

  const startedAt = parseIsoDate(body.startedAt);
  if (!startedAt) {
    throw new Error("startedAt is required.");
  }

  // endedAt is only meaningful for `end`, but harmless if sent elsewhere.
  const endedAt = action === "end" ? (parseIsoDate(body.endedAt) ?? new Date()) : parseIsoDate(body.endedAt);

  let platform = null;
  if (body.platform != null && body.platform !== "") {
    platform = String(body.platform).trim().toLowerCase();
    if (!ALLOWED_PLATFORMS.includes(platform)) {
      platform = "other";
    }
  }

  let appVersion = null;
  if (body.appVersion != null && body.appVersion !== "") {
    appVersion = String(body.appVersion).trim().slice(0, MAX_APP_VERSION_LENGTH);
  }

  return { action, sessionId, startedAt, endedAt, platform, appVersion };
}

/**
 * clampTimestamps
 * Brings device-clock timestamps into server-safe bounds:
 *   • startedAt can never be in the future (clamped to now)
 *   • endedAt   can never be in the future (clamped to now)
 *   • endedAt   can never precede startedAt (raised to startedAt)
 *
 * @param {Date} startedAt
 * @param {Date|null} endedAt
 * @param {Date} [now]
 * @returns {{ startedAt: Date, endedAt: Date|null }}
 */
export function clampTimestamps(startedAt, endedAt, now = new Date()) {
  let start = startedAt.getTime() > now.getTime() ? new Date(now) : new Date(startedAt);
  if (!endedAt) return { startedAt: start, endedAt: null };

  let end = endedAt.getTime() > now.getTime() ? new Date(now) : new Date(endedAt);
  if (end.getTime() < start.getTime()) end = new Date(start);
  return { startedAt: start, endedAt: end };
}

/**
 * computeDurationSeconds
 * Session length in whole seconds, clamped to [0, MAX_SESSION_SECONDS].
 *
 * @param {Date} startedAt
 * @param {Date} endedAt
 * @param {Date} [now]
 * @returns {number}
 */
export function computeDurationSeconds(startedAt, endedAt, now = new Date()) {
  const { startedAt: start, endedAt: end } = clampTimestamps(startedAt, endedAt, now);
  if (!end) return 0;
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(seconds, MAX_SESSION_SECONDS);
}
