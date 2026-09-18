/**
 * auth.js
 * ─────
 * Express middleware that replaces Clerk's clerkMiddleware() + requireUserAuth.
 *
 * Reads the Bearer token from the Authorization header, verifies it as an
 * access JWT, and exposes the resolved user id on req.auth.userId so the
 * existing controllers keep working without modification.
 */

import { verifyAccessToken } from "../utils/jwt.js";

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
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};