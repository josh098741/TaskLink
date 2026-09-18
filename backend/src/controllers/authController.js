/**
 * authController.js
 * ───────────────────
 * Email/password auth: register, login, refresh, logout.
 *
 * User IDs are generated server-side with crypto.randomUUID() — the same
 * shape Clerk used to produce — so the users.id primary key and every FK
 * reference (posts.posterId, posts.acceptedBy) stays identical in format.
 *
 * Passwords are hashed with bcrypt (12 salt rounds).
 */

import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../utils/env.js";
import {
    signTokenPair,
    verifyRefreshToken,
} from "../utils/jwt.js";

const SALT_ROUNDS = 12;

// In-memory reset codes (dev). Replace with a DB/Redis table + real email
// sender before production. Keyed by lowercased email.
const resetCodes = new Map();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate E.164-ish email shape. Cheap client-style check; the DB unique
 * constraint is the real guard.
 */
function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password) {
    if (!password || typeof password !== "string") return false;
    return password.length >= 8;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Body: { email, password, firstName, lastName? }
 *
 * Creates a brand-new user row with a server-generated UUID id and a
 * bcrypt-hashed password. Returns access + refresh tokens.
 */
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body || {};

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "A valid email is required." });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters." });
        }
        if (!firstName || firstName.trim().length < 1) {
            return res.status(400).json({ error: "First name is required." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanFirst = firstName.trim();
        const cleanLast = lastName?.trim() || null;

        // Reject duplicate email early with a friendly message.
        const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

        if (existing) {
            return res.status(409).json({
                error: "An account with that email already exists.",
            });
        }

        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const userId = randomUUID();

        await db.insert(users).values({
            id: userId,
            email: cleanEmail,
            firstName: cleanFirst,
            lastName: cleanLast,
            passwordHash: hashed,
            isOnboarded: false,
        });

        const tokens = signTokenPair(userId);

        console.log(`[register] userId=${userId} email=${cleanEmail}`);

        return res.status(201).json({
            success: true,
            user: {
                id: userId,
                email: cleanEmail,
                firstName: cleanFirst,
                lastName: cleanLast,
                isOnboarded: false,
            },
            ...tokens,
        });
    } catch (error) {
        console.error("[register] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Body: { email, password }
 * Verifies credentials and returns access + refresh tokens.
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!isValidEmail(email) || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

        if (!user || !user.passwordHash) {
            // Don't reveal whether the email exists.
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const tokens = signTokenPair(user.id);

        console.log(`[login] userId=${user.id} email=${cleanEmail}`);

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isOnboarded: user.isOnboarded,
            },
            ...tokens,
        });
    } catch (error) {
        console.error("[login] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
/**
 * Body: { refreshToken }
 * Mints a fresh access token from a valid refresh token.
 */
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body || {};

        if (!refreshToken || typeof refreshToken !== "string") {
            return res.status(400).json({ error: "Refresh token is required." });
        }

        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch {
            return res.status(401).json({ error: "Invalid or expired refresh token." });
        }

        // Confirm the user still exists (e.g. deleted account).
        const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1);

        if (!user) {
            return res.status(401).json({ error: "User no longer exists." });
        }

        const tokens = signTokenPair(user.id);
        console.log(`[refresh] userId=${user.id}`);

        return res.status(200).json({ success: true, ...tokens });
    } catch (error) {
        console.error("[refresh] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─── POST /api/auth/google ────────────────────────────────────────────────────
/**
 * Body: { idToken }
 *
 * Verifies a Google ID token (issued by the mobile app's OAuth flow),
 * then finds-or-creates the user by email and mints the usual JWT pair.
 *
 * Security: google-auth-library checks the token signature, issuer, audience
 * (any registered Google client id), and expiry. We additionally require a
 * verified email before trusting the identity.
 */
const googleSignIn = async (req, res) => {
    try {
        const { idToken } = req.body || {};

        if (!idToken || typeof idToken !== "string") {
            return res.status(400).json({ error: "Google idToken is required." });
        }

        const client = new OAuth2Client();
        const audience = [
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_ANDROID_CLIENT_ID,
        ].filter(Boolean);

        const ticket = await client.verifyIdToken({ idToken, audience });
        const payload = ticket.getPayload();

        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({ error: "Unverified Google account." });
        }

        const cleanEmail = payload.email.trim().toLowerCase();
        const firstName = payload.given_name || payload.name?.split(" ")[0] || "Google";
        const lastName =
            payload.family_name ||
            payload.name?.split(" ").slice(1).join(" ") ||
            null;
        const imageUrl = payload.picture || null;

        let [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

        if (!user) {
            const userId = randomUUID();
            await db.insert(users).values({
                id: userId,
                email: cleanEmail,
                firstName,
                lastName,
                imageUrl,
                passwordHash: null,
                isOnboarded: false,
            });

            // Backfill the profile object the client expects from register/login.
            user = {
                id: userId,
                email: cleanEmail,
                firstName,
                lastName,
                imageUrl,
                isOnboarded: false,
            };
            console.log(`[googleSignIn] created userId=${userId} email=${cleanEmail}`);
        } else {
            // Sync any missing profile fields from Google (name/photo only).
            const updates = {};
            if (!user.firstName && firstName) updates.firstName = firstName;
            if (!user.lastName && lastName) updates.lastName = lastName;
            if (!user.imageUrl && imageUrl) updates.imageUrl = imageUrl;
            if (Object.keys(updates).length > 0) {
                await db
                    .update(users)
                    .set({ ...updates, updatedAt: new Date() })
                    .where(eq(users.id, user.id));
            }
            console.log(`[googleSignIn] logged in userId=${user.id} email=${cleanEmail}`);
        }

        const tokens = signTokenPair(user.id);

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl || null,
                isOnboarded: user.isOnboarded,
            },
            ...tokens,
        });
    } catch (error) {
        console.error("[googleSignIn] Error:", error);
        return res.status(401).json({ error: "Invalid Google token." });
    }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * Stateless JWT — nothing server-side to invalidate. Client drops tokens.
 * Provided so the mobile app has a single logout endpoint to call.
 */
const logout = async (req, res) => {
    return res.status(200).json({ success: true });
};

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
/**
 * Body: { email }
 * Generates a one-time reset code for the account (dev: returned in the
 * response so the mobile screen can consume it without a mail service).
 * Always returns success to avoid user enumeration.
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ error: "A valid email is required." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const [user] = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

        if (user) {
            const code = String(Math.floor(100000 + Math.random() * 900000));
            resetCodes.set(cleanEmail, {
                code,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });
            console.log(`[forgotPassword] reset code for ${cleanEmail}: ${code}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[forgotPassword] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
/**
 * Body: { email, code, newPassword }
 * Verifies the reset code and updates the password hash.
 */
const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body || {};
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: "Email, code, and new password are required." });
        }
        if (typeof newPassword !== "string" || newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const record = resetCodes.get(cleanEmail);

        if (!record || record.code !== String(code).trim() || record.expiresAt < Date.now()) {
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db
            .update(users)
            .set({ passwordHash: hashed, updatedAt: new Date() })
            .where(eq(users.id, user.id));

        resetCodes.delete(cleanEmail);

        console.log(`[resetPassword] password updated for ${cleanEmail}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[resetPassword] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export { register, login, refresh, logout, forgotPassword, resetPassword, googleSignIn };