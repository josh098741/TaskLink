/**
 * authRouter.js
 * ─────────────
 * Public auth routes. No authentication middleware on register / login /
 * refresh / logout — only the refresh handler validates its own token.
 */

import { Router } from "express";
import {
    register,
    login,
    refresh,
    logout,
    forgotPassword,
    resetPassword,
} from "../Controllers/authController.js";

const authRouter = Router();

/**
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName? }
 * Returns { success, user, accessToken, refreshToken }
 */
authRouter.post("/register", register);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns { success, user, accessToken, refreshToken }
 */
authRouter.post("/login", login);

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns { success, accessToken, refreshToken }
 */
authRouter.post("/refresh", refresh);

/**
 * POST /api/auth/logout
 * Stateless — client drops tokens. Provided for symmetry.
 */
authRouter.post("/logout", logout);

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Generates a one-time reset code for the account.
 */
authRouter.post("/forgot-password", forgotPassword);

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPassword }
 * Verifies the reset code and updates the password hash.
 */
authRouter.post("/reset-password", resetPassword);

export default authRouter;