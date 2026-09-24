import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getSummary, reportSession } from "../controllers/analyticsController.js";

const analyticsRouter = Router();

// All analytics routes require a valid access JWT — the same `authenticate`
// middleware that guards userRouter/postRouter/etc. Nothing about the auth
// flow itself changes; this is additive only.
analyticsRouter.use(authenticate);

/**
 * POST /api/analytics/session
 * Records a session lifecycle event (start | heartbeat | end) from the
 * mobile ActivityBridge. Body: { action, sessionId, startedAt, ... }
 */
analyticsRouter.post("/analytics/session", reportSession);

/**
 * GET /api/analytics/summary
 * Admin dashboard payload. 403 for non-admins.
 */
analyticsRouter.get("/analytics/summary", getSummary);

export default analyticsRouter;