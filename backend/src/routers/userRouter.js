import { Router } from "express";
import { clerkMiddleware } from "@clerk/express";
import { getMe, completeOnboarding } from "../controllers/userController.js";

const userRouter = Router();

// Apply Clerk middleware to extract req.auth if available
userRouter.use(clerkMiddleware());

/**
 * Resilient auth middleware
 * Checks req.auth.userId first, then falls back to x-clerk-user-id header or body clerkId.
 */
const requireUserAuth = (req, res, next) => {
  const clerkId =
    req.auth?.userId ||
    req.headers["x-clerk-user-id"] ||
    req.body?.clerkId;

  if (!clerkId || typeof clerkId !== "string" || clerkId.trim() === "") {
    return res.status(401).json({ error: "Unauthorised" });
  }

  // Ensure req.auth has userId populated for downstream controllers
  req.auth = { ...(req.auth || {}), userId: clerkId.trim() };
  next();
};

/**
 * GET /api/user/me
 * Returns the current user's profile and onboarding state.
 */
userRouter.get("/user/me", requireUserAuth, getMe);

/**
 * PUT /api/user/onboarding
 * Accepts the collected onboarding data and marks isOnboarded = true.
 */
userRouter.put("/user/onboarding", requireUserAuth, completeOnboarding);

export default userRouter;

