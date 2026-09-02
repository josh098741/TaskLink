import { Router } from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { getMe, completeOnboarding } from "../controllers/userController.js";

const userRouter = Router();

// Apply Clerk middleware to all user routes
userRouter.use(clerkMiddleware());

/**
 * GET /api/user/me
 * Returns the current user's profile and onboarding state.
 * Requires a valid Clerk session token in the Authorization header.
 */
userRouter.get("/user/me", requireAuth(), getMe);

/**
 * PUT /api/user/onboarding
 * Accepts the collected onboarding data and marks isOnboarded = true.
 * Body: { role, phoneNumber, location, categories, firstName, lastName }
 */
userRouter.put("/user/onboarding", requireAuth(), completeOnboarding);

export default userRouter;
