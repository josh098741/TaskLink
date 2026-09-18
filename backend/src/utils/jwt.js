/**
 * jwt.js
 * ─────
 * JWT signing / verification for the custom auth stack.
 *
 * Two-token model:
 *   • ACCESS_TOKEN  – short-lived (15 min), verified on every request.
 *   • REFRESH_TOKEN – long-lived (7 days), used only to mint new access tokens.
 *
 * Both are HS256, signed with env.JWT_SECRET / env.JWT_REFRESH_SECRET.
 * The payload carries { userId, type } so the same secret can never be
 * mistaken between the two token kinds.
 */

import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

const ACCESS_TYPE = "access";
const REFRESH_TYPE = "refresh";

/**
 * Sign a new access token for a user id.
 * @param {string} userId
 * @returns {string}
 */
export function signAccessToken(userId) {
    return jwt.sign({ userId, type: ACCESS_TYPE }, env.JWT_SECRET, {
        expiresIn: ACCESS_EXPIRES,
    });
}

/**
 * Sign a new refresh token for a user id.
 * @param {string} userId
 * @returns {string}
 */
export function signRefreshToken(userId) {
    return jwt.sign({ userId, type: REFRESH_TYPE }, env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRES,
    });
}

/**
 * Sign both tokens at once (login / register).
 * @param {string} userId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function signTokenPair(userId) {
    return {
        accessToken: signAccessToken(userId),
        refreshToken: signRefreshToken(userId),
    };
}

/**
 * Verify and decode an access token.
 * @param {string} token
 * @returns {{ userId: string, type: string, iat: number, exp: number }}
 * @throws {Error} if invalid or wrong type
 */
export function verifyAccessToken(token) {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!payload || payload.type !== ACCESS_TYPE) {
        throw new Error("Invalid access token");
    }
    return payload;
}

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {{ userId: string, type: string, iat: number, exp: number }}
 * @throws {Error} if invalid or wrong type
 */
export function verifyRefreshToken(token) {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (!payload || payload.type !== REFRESH_TYPE) {
        throw new Error("Invalid refresh token");
    }
    return payload;
}