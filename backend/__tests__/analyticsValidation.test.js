import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HEARTBEAT_MIN_INTERVAL_MS,
  MAX_SESSION_SECONDS,
  SESSION_ACTIONS,
  clampTimestamps,
  computeDurationSeconds,
  validateSessionReport,
} from "../src/utils/analyticsValidation.js";

// ── validateSessionReport ─────────────────────────────────────────────────

test("validateSessionReport returns a normalised start report", () => {
  const report = validateSessionReport({
    action: "start",
    sessionId: "ses_1234_abcd",
    startedAt: "2026-09-23T08:00:00.000Z",
    endedAt: null,
    platform: "ANDROID",
    appVersion: "  1.4.2  ",
  });
  assert.equal(report.action, "start");
  assert.equal(report.sessionId, "ses_1234_abcd");
  assert.deepEqual(report.startedAt, new Date("2026-09-23T08:00:00.000Z"));
  assert.equal(report.endedAt, null);
  assert.equal(report.platform, "android");
  assert.equal(report.appVersion, "1.4.2");
});

test("validateSessionReport rejects a missing/invalid action", () => {
  assert.throws(
    () => validateSessionReport({ action: "nope", sessionId: "s", startedAt: "2026-09-23T00:00:00Z" }),
    /action must be one of/
  );
  assert.throws(
    () => validateSessionReport({ sessionId: "s", startedAt: "2026-09-23T00:00:00Z" }),
    /action must be one of/
  );
});

test("validateSessionReport requires a sessionId", () => {
  assert.throws(
    () => validateSessionReport({ action: "start", startedAt: "2026-09-23T00:00:00Z" }),
    /sessionId is required/
  );
  assert.throws(
    () => validateSessionReport({ action: "start", sessionId: "  ", startedAt: "2026-09-23T00:00:00Z" }),
    /sessionId is required/
  );
});

test("validateSessionReport requires a valid startedAt", () => {
  assert.throws(
    () => validateSessionReport({ action: "start", sessionId: "s" }),
    /startedAt is required/
  );
  assert.throws(
    () => validateSessionReport({ action: "start", sessionId: "s", startedAt: "not-a-date" }),
    /ISO date string/
  );
});

test("validateSessionReport defaults endedAt to now for end action only", () => {
  const before = new Date(Date.now() - 100);
  const report = validateSessionReport({ action: "end", sessionId: "s", startedAt: "2026-09-23T00:00:00Z" });
  assert.ok(report.endedAt instanceof Date);
  assert.ok(report.endedAt.getTime() >= before.getTime());
});

test("validateSessionReport rejects invalid endedAt", () => {
  assert.throws(
    () => validateSessionReport({ action: "end", sessionId: "s", startedAt: "2026-09-23T00:00:00Z", endedAt: "garbage" }),
    /ISO date string/
  );
});

test("validateSessionReport maps unknown platform to other", () => {
  const report = validateSessionReport({
    action: "heartbeat",
    sessionId: "s",
    startedAt: "2026-09-23T00:00:00Z",
    platform: "windows",
  });
  assert.equal(report.platform, "other");
});

test("SESSION_ACTIONS and HEARTBEAT constants exported", () => {
  assert.deepEqual(SESSION_ACTIONS, ["start", "heartbeat", "end"]);
  assert.equal(HEARTBEAT_MIN_INTERVAL_MS, 30_000);
});

// ── clampTimestamps ────────────────────────────────────────────────────────

test("clampTimestamps clamps future timestamps to now", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");
  const future = new Date("2026-09-24T12:00:00.000Z");
  const { startedAt, endedAt } = clampTimestamps(future, future, now);
  assert.equal(startedAt.getTime(), now.getTime());
  assert.equal(endedAt.getTime(), now.getTime());
});

test("clampTimestamps raises an endedAt that precedes startedAt", () => {
  const startedAt = new Date("2026-09-23T10:00:00.000Z");
  const endedAt = new Date("2026-09-23T09:00:00.000Z");
  const { endedAt: end } = clampTimestamps(startedAt, endedAt);
  assert.equal(end.getTime(), startedAt.getTime());
});

test("clampTimestamps leaves null endedAt untouched", () => {
  const startedAt = new Date("2026-09-23T10:00:00.000Z");
  const { startedAt: start, endedAt } = clampTimestamps(startedAt, null);
  assert.equal(start.getTime(), startedAt.getTime());
  assert.equal(endedAt, null);
});

// ── computeDurationSeconds ─────────────────────────────────────────────────

test("computeDurationSeconds measures whole seconds", () => {
  const startedAt = new Date("2026-09-23T10:00:00.000Z");
  const endedAt = new Date("2026-09-23T10:01:30.000Z");
  assert.equal(computeDurationSeconds(startedAt, endedAt), 90);
});

test("computeDurationSeconds clamps to the global max", () => {
  const startedAt = new Date("2026-01-01T00:00:00.000Z");
  const endedAt = new Date("2026-09-23T00:00:00.000Z");
  assert.equal(computeDurationSeconds(startedAt, endedAt), MAX_SESSION_SECONDS);
});

test("computeDurationSeconds is 0 for impossible/negative spans", () => {
  const startedAt = new Date("2026-09-23T10:00:00.000Z");
  const endedAt = new Date("2026-09-23T09:59:00.000Z");
  assert.equal(computeDurationSeconds(startedAt, endedAt), 0);
  assert.equal(computeDurationSeconds(startedAt, null), 0);
});