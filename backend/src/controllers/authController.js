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
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
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

export { register, login, refresh, logout, forgotPassword, resetPassword };