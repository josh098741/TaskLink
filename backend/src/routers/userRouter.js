import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getMe,
  completeOnboarding,
  updatePreferences,
  updatePushToken,
} from "../controllers/userController.js";

const userRouter = Router();

/**
 * authenticate
 * Verifies the Bearer access JWT and populates req.auth.userId.
 * Replaces the old session middleware + the x-clerk-user-id fallback.
 */
userRouter.use(authenticate);

/**
 * GET /api/user/me
 * Returns the current user's profile and onboarding state.
 */
userRouter.get("/user/me", getMe);

/**
 * PUT /api/user/onboarding
 * Accepts the collected onboarding data and marks isOnboarded = true.
 */
userRouter.put("/user/onboarding", completeOnboarding);

/**
 * PATCH /api/user/preferences
 * Updates notification & work preference toggles.
 */
userRouter.patch("/user/preferences", updatePreferences);

/**
 * PATCH /api/user/push-token
 * Registers (or clears, with a null/empty body value) the device's Expo push
 * token so the server can deliver chat notifications when the app is closed.
 */
userRouter.patch("/user/push-token", updatePushToken);

export default userRouter;