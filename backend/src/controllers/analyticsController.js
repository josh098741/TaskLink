/**
 * analyticsController.js
 * ──────────────────────
 * First-party activity analytics: "when was a user last in the app" and
 * "how long was each visit".
 *
 * Routes (mounted at /api/analytics, all authenticated):
 *   POST /session  — start | heartbeat | end from the mobile ActivityBridge
 *   GET  /summary  — aggregate dashboard payload (admins only)
 *
 * Trust model: device-clock timestamps are validated and clamped by
 * analyticsValidation.js; every write is scoped to req.auth.userId so one
 * user can never touch another user's session row.
 *
 * The admin gate reads users.is_admin straight from the database on every
 * request — never from the JWT — so revoking admin is a single UPDATE with
 * no token re-issue and no change to the auth flow.
 */

import {
  and,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
} from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userSessions } from "../db/schema.js";
import {
  HEARTBEAT_MIN_INTERVAL_MS,
  clampTimestamps,
  computeDurationSeconds,
  validateSessionReport,
} from "../utils/analyticsValidation.js";

/** Insert a session row if the id is unknown (self-heals lost `start`s). */
function ensureSessionRow({ sessionId, userId, startedAt, lastHeartbeatAt, platform, appVersion }) {
  return db
    .insert(userSessions)
    .values({
      id: sessionId,
      userId,
      startedAt,
      lastHeartbeatAt,
      platform,
      appVersion,
    })
    .onConflictDoNothing();
}

/** Best-effort last_seen bump — heartbeat/start imply the app is open. */
function bumpLastSeen(userId, now = new Date()) {
  return db.update(users).set({ lastSeenAt: now }).where(eq(users.id, userId));
}

/**
 * POST /api/analytics/session
 * Body: { action: 'start'|'heartbeat'|'end', sessionId, startedAt,
 *         endedAt?, platform?, appVersion? }
 */
export const reportSession = async (req, res) => {
  let report;
  try {
    report = validateSessionReport(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const userId = req.auth.userId;
  const now = new Date();
  const { action, sessionId, startedAt, endedAt, platform, appVersion } = report;
  const { startedAt: start, endedAt: end } = clampTimestamps(startedAt, endedAt, now);

  try {
    if (action === "start") {
      await ensureSessionRow({
        sessionId,
        userId,
        startedAt: start,
        lastHeartbeatAt: now,
        platform,
        appVersion,
      });
      // Re-assert heartbeat only for this user's still-open session.
      await db
        .update(userSessions)
        .set({ lastHeartbeatAt: now, updatedAt: now })
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId),
            isNull(userSessions.endedAt)
          )
        );
      await bumpLastSeen(userId, now);
      return res.status(200).json({ success: true, action, sessionId });
    }

    if (action === "heartbeat") {
      // Self-heal: if `start` was lost (flaky network), create the row now.
      await ensureSessionRow({
        sessionId,
        userId,
        startedAt: start,
        lastHeartbeatAt: now,
        platform,
        appVersion,
      });
      // Throttled update — replays/duplicates closer than 30s are dropped.
      await db
        .update(userSessions)
        .set({ lastHeartbeatAt: now, updatedAt: now })
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId),
            isNull(userSessions.endedAt),
            lt(userSessions.lastHeartbeatAt, new Date(now.getTime() - HEARTBEAT_MIN_INTERVAL_MS))
          )
        );
      await bumpLastSeen(userId, now);
      return res.status(200).json({ success: true, action, sessionId });
    }

    // action === "end"
    // Self-heal for force-killed sessions replayed on next launch: the row
    // may not exist yet (start was never acked) — create then close it.
    await ensureSessionRow({
      sessionId,
      userId,
      startedAt: start,
      lastHeartbeatAt: end ?? now,
      platform,
      appVersion,
    });

    const durationSeconds = computeDurationSeconds(start, end ?? now, now);
    const closed = await db
      .update(userSessions)
      .set({
        endedAt: end ?? now,
        durationSeconds,
        lastHeartbeatAt: end ?? now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userSessions.id, sessionId),
          eq(userSessions.userId, userId),
          isNull(userSessions.endedAt)
        )
      )
      .returning({ id: userSessions.id });

    await bumpLastSeen(userId, now);

    return res.status(200).json({
      success: true,
      action,
      sessionId,
      durationSeconds,
      // false when the session was already closed (idempotent replay).
      closed: closed.length > 0,
    });
  } catch (error) {
    console.error("[analytics] reportSession error:", error.message);
    return res.status(500).json({ error: "Failed to record session." });
  }
};

/**
 * GET /api/analytics/summary
 * Admin-only dashboard payload. 403 for non-admins (is_admin read live).
 */
export const getSummary = async (req, res) => {
  const userId = req.auth.userId;

  // ── Admin gate: fresh DB read, never the JWT ────────────────────────────
  try {
    const [me] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!me?.isAdmin) {
      return res.status(403).json({ error: "Admin access required." });
    }
  } catch (error) {
    console.error("[analytics] admin check error:", error.message);
    return res.status(500).json({ error: "Failed to verify access." });
  }

  try {
    const now = Date.now();
    const h24 = new Date(now - 24 * 3600_000);
    const d7 = new Date(now - 7 * 24 * 3600_000);
    const d30 = new Date(now - 30 * 24 * 3600_000);

    const activeSince = async (cutoff) => {
      const [row] = await db
        .select({ value: countDistinct(userSessions.userId) })
        .from(userSessions)
        .where(gte(userSessions.startedAt, cutoff));
      return Number(row?.value ?? 0);
    };

    const [active24h, active7d, active30d] = await Promise.all([
      activeSince(h24),
      activeSince(d7),
      activeSince(d30),
    ]);

    const [week] = await db
      .select({
        totalSessions: count(userSessions.id),
        avgDurationSeconds: avg(userSessions.durationSeconds),
      })
      .from(userSessions)
      .where(and(gte(userSessions.startedAt, d7), isNotNull(userSessions.endedAt)));

    const [userCount, sessionCount] = await Promise.all([
      db.select({ value: count(users.id) }).from(users),
      db.select({ value: count(userSessions.id) }).from(userSessions),
    ]);
    const totals = {
      users: Number(userCount?.[0]?.value ?? 0),
      sessions: Number(sessionCount?.[0]?.value ?? 0),
    };

    const recentSessions = await db
      .select({
        id: userSessions.id,
        startedAt: userSessions.startedAt,
        endedAt: userSessions.endedAt,
        durationSeconds: userSessions.durationSeconds,
        platform: userSessions.platform,
        appVersion: userSessions.appVersion,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .orderBy(desc(userSessions.startedAt))
      .limit(25);

    const lastSeen = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        lastSeenAt: users.lastSeenAt,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(isNotNull(users.lastSeenAt))
      .orderBy(desc(users.lastSeenAt))
      .limit(50);

    return res.status(200).json({
      totals: {
        users: totals.users,
        sessions: totals.sessions,
        active24h,
        active7d,
        active30d,
        totalSessions7d: Number(week?.totalSessions ?? 0),
        avgDurationSeconds7d:
          week?.avgDurationSeconds == null ? null : Math.round(Number(week.avgDurationSeconds)),
      },
      recentSessions,
      lastSeen,
    });
  } catch (error) {
    console.error("[analytics] summary error:", error.message);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
};
