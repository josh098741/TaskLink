/**
 * auth.js
 * ─────
 * Express middleware that replaces Clerk's clerkMiddleware() + requireUserAuth.
 *
 * Reads the Bearer token from the Authorization header, verifies it as an
 * access JWT, and exposes the resolved user id on req.auth.userId so the
 * existing controllers keep working without modification.
 *
 * AUTH CONTRACT (do not change): 401 on missing token, 401 on invalid/expired
 * token, otherwise req.auth = { userId }. Nothing else can reject a request.
 *
 * After a successful verify it also maintains users.last_seen_at with a
 * throttled, fire-and-forget write — analytics only, fully non-blocking, and
 * wrapped so even an unexpected throw can never affect authentication.
 */

import { verifyAccessToken } from "../utils/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { and, eq, isNull, lt, or } from "drizzle-orm";

/** Only rewrite last_seen_at when it is older than this (per user). */
const LAST_SEEN_THROTTLE_MS = 60_000;

/**
 * touchLastSeen
 * Best-effort "user is/was in the app" signal. Atomic conditional UPDATE —
 * no read, writes at most once per user per minute, never awaited.
 */
function touchLastSeen(userId) {
    try {
        const cutoff = new Date(Date.now() - LAST_SEEN_THROTTLE_MS);
        db.update(users)
            .set({ lastSeenAt: new Date() })
            .where(
                and(
                    eq(users.id, userId),
                    or(isNull(users.lastSeenAt), lt(users.lastSeenAt, cutoff))
                )
            )
            .catch(() => {}); // analytics must never surface as an error
    } catch {
        /* ignore — auth already succeeded */
    }
}

/**
 * authenticate
 * Protects a route. Responds 401 if no/invalid/expired access token.
 * Populates req.auth = { userId } on success.
 */
export const authenticate = (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Unauthorised" });
    }

    try {
        const payload = verifyAccessToken(token);
        req.auth = { userId: payload.userId };
        touchLastSeen(payload.userId);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};