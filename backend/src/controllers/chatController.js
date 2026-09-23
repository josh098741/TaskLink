/**
 * chatController.js
 * ─────────────────
 * REST endpoints for appointment-scoped chat. Persistence lives in
 * messageService.js; this controller is the thin HTTP layer that also fans
 * events out over the realtime hub (WebSocket) and falls back to push
 * notifications when the recipient has no live connection.
 *
 * Routes (mounted at /api/chat, all authenticated):
 *   GET  /threads
 *   GET  /threads/badge
 *   GET  /:appointmentId/messages
 *   POST /:appointmentId/messages
 *   POST /:appointmentId/read
 */

import { hub } from "../realtime/index.js";
import { sendPushToUser } from "../utils/push.js";
import { parseMessagesPagination } from "../utils/chatValidation.js";
import {
  countUnreadMessages,
  listMessages,
  listThreads,
  markThreadRead,
  otherParticipant,
  saveMessage,
} from "../services/messageService.js";

/**
 * GET /api/chat/threads
 * The user's appointment threads with last message, unread count & the other
 * participant.
 */
export const getThreads = async (req, res) => {
  try {
    const threads = await listThreads(req.auth.userId);
    return res.status(200).json({ threads });
  } catch (error) {
    console.error("[chat] listThreads error:", error.message);
    return res.status(500).json({ error: "Failed to load conversations. Please try again." });
  }
};

/**
 * GET /api/chat/threads/badge
 * Total unread count across all the user's threads (drives the app badge).
 */
export const getUnreadBadge = async (req, res) => {
  try {
    const unread = await countUnreadMessages(req.auth.userId);
    return res.status(200).json({ unread });
  } catch (error) {
    console.error("[chat] unread badge error:", error.message);
    return res.status(500).json({ error: "Failed to load unread count." });
  }
};

/**
 * GET /api/chat/:appointmentId/messages?limit=&before=
 * Latest-first page of messages, returned oldest-first.
 */
export const getMessages = async (req, res) => {
  let pagination;
  try {
    pagination = parseMessagesPagination(req.query);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const result = await listMessages(req.params.appointmentId, req.auth.userId, pagination);
    return res.status(200).json({ ...result, appointmentId: req.params.appointmentId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[chat] listMessages error:", error.message);
    return res.status(500).json({ error: "Failed to load messages. Please try again." });
  }
};

/**
 * POST /api/chat/:appointmentId/messages  body: { body: string }
 */
export const postMessage = async (req, res) => {
  const body = String(req.body?.body ?? "");
  if (!body.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  try {
    const { appointment, message } = await saveMessage(
      req.params.appointmentId,
      req.auth.userId,
      body
    );

    hub.publish(`appt:${req.params.appointmentId}`, {
      type: "message:new",
      appointmentId: req.params.appointmentId,
      message,
    });

    const recipient = otherParticipant(appointment, req.auth.userId);
    if (!hub.hasUser(recipient)) {
      await sendPushToUser(recipient, {
        title: "New message",
        body: message.body.slice(0, 140),
        data: { type: "chat", appointmentId: req.params.appointmentId },
      });
    }

    return res.status(201).json({ success: true, message });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[chat] postMessage error:", error.message);
    return res.status(500).json({ error: "Failed to send message. Please try again." });
  }
};

/**
 * POST /api/chat/:appointmentId/read
 * Marks all of the other participant's messages as read.
 */
export const postRead = async (req, res) => {
  try {
    const { appointment, marked } = await markThreadRead(req.params.appointmentId, req.auth.userId);

    hub.publish(`appt:${req.params.appointmentId}`, {
      type: "message:read",
      appointmentId: req.params.appointmentId,
      by: req.auth.userId,
    });

    return res.status(200).json({ success: true, marked, other: otherParticipant(appointment, req.auth.userId) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("[chat] markRead error:", error.message);
    return res.status(500).json({ error: "Failed to mark conversation as read." });
  }
};