import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getMessages,
  getThreads,
  getUnreadBadge,
  postMessage,
  postRead,
} from "../controllers/chatController.js";

const chatRouter = Router();

chatRouter.use(authenticate);

/**
 * GET /api/chat/threads
 * The authenticated user's appointment threads.
 */
chatRouter.get("/chat/threads", getThreads);

/**
 * GET /api/chat/threads/badge
 * Total unread bubble across all threads for the user.
 */
chatRouter.get("/chat/threads/badge", getUnreadBadge);

/**
 * GET /api/chat/:appointmentId/messages
 * Latest page of messages for a thread (oldest-first).
 */
chatRouter.get("/chat/:appointmentId/messages", getMessages);

/**
 * POST /api/chat/:appointmentId/messages
 * Sends a message. Body: { body: string }
 */
chatRouter.post("/chat/:appointmentId/messages", postMessage);

/**
 * POST /api/chat/:appointmentId/read
 * Marks the thread read for the current user.
 */
chatRouter.post("/chat/:appointmentId/read", postRead);

export default chatRouter;