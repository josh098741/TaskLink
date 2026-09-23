/**
 * ws/server.js
 * ─────────────
 * WebSocket endpoint for live chat delivery.
 *
 * Protocol (JSON frames in both directions):
 *
 *   client → server
 *     { type: "subscribe", appointmentId }           join a thread channel
 *     { type: "message",   appointmentId, body }     send a chat message
 *     { type: "typing",    appointmentId }           typing indicator
 *     { type: "read",      appointmentId }           mark thread read
 *
 *   server → client
 *     { type: "message:new",  appointmentId, message }
 *     { type: "message:read", appointmentId, by }
 *     { type: "typing",       appointmentId, by }
 *     { type: "error",        message }
 *
 * Auth: the socket URL carries the access JWT as a query param
 * (`?token=<jwt>`). It is verified synchronously at upgrade time. Access JWTs
 * are short-lived (15 min); the client reconnects using its refreshed token.
 *
 * Deployment notes:
 *   • Local dev / single Node process: the hub broadcasts in-process.
 *   • Vercel (Fluid compute, WebSocket beta): each function instance runs a
 *     hub; Upstash Redis bridges instances so a user on instance A reaches a
 *     user whose socket is on instance B. The client reconnects with backoff
 *     and resubscribes — Vercel functions eventually recycle connections.
 */

import { WebSocketServer } from "ws";
import { verifyAccessToken } from "../utils/jwt.js";
import {
  assertAppointmentParticipant,
  otherParticipant,
  saveMessage,
  markThreadRead,
} from "../services/messageService.js";
import { sendPushToUser } from "../utils/push.js";

const HEARTBEAT_INTERVAL_MS = 30000;

function sendJson(ws, event) {
  if (ws.readyState === ws.OPEN || ws.readyState === 1) {
    try {
      ws.send(JSON.stringify(event));
    } catch {
      /* ignore */
    }
  }
}

export function attachWebSocket(server, hub) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token") ?? "";
    let userId;
    try {
      userId = verifyAccessToken(token).userId;
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, userId);
    });
  });

  wss.on("connection", (ws, _req, userId) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    hub.register(ws, userId);

    ws.on("message", async (raw) => {
      let frame;
      try {
        frame = JSON.parse(raw.toString());
      } catch {
        return sendJson(ws, { type: "error", message: "Invalid frame." });
      }
      if (!frame || typeof frame !== "object") {
        return sendJson(ws, { type: "error", message: "Invalid frame." });
      }

      switch (frame.type) {
        case "subscribe": {
          const appointmentId = String(frame.appointmentId ?? "").trim();
          if (!appointmentId) {
            return sendJson(ws, { type: "error", message: "appointmentId is required." });
          }
          try {
            await assertAppointmentParticipant(appointmentId, userId);
          } catch (error) {
            return sendJson(ws, {
              type: "error",
              message: error.message || "You cannot join this conversation.",
            });
          }
          hub.join(ws, `appt:${appointmentId}`);
          return;
        }

        case "message": {
          const appointmentId = String(frame.appointmentId ?? "").trim();
          const body = typeof frame.body === "string" ? frame.body : "";
          if (!appointmentId) {
            return sendJson(ws, { type: "error", message: "appointmentId is required." });
          }
          try {
            const { appointment, message } = await saveMessage(appointmentId, userId, body);
            hub.publish(`appt:${appointmentId}`, {
              type: "message:new",
              appointmentId,
              message,
            });
            // Push notification only when the other party has no live socket on
            // this instance (their realtime delivery is already handled).
            const recipient = otherParticipant(appointment, userId);
            if (!hub.hasUser(recipient)) {
              await sendPushToUser(recipient, {
                title: "New message",
                body: body.slice(0, 140),
                data: { type: "chat", appointmentId },
              });
            }
          } catch (error) {
            return sendJson(ws, {
              type: "error",
              message: error.message || "Failed to send message.",
            });
          }
          return;
        }

        case "typing": {
          const appointmentId = String(frame.appointmentId ?? "").trim();
          if (!appointmentId) return;
          hub.broadcastLocal(`appt:${appointmentId}`, {
            type: "typing",
            appointmentId,
            by: userId,
          }, ws);
          return;
        }

        case "read": {
          const appointmentId = String(frame.appointmentId ?? "").trim();
          if (!appointmentId) return sendJson(ws, { type: "error", message: "appointmentId is required." });
          try {
            await markThreadRead(appointmentId, userId);
            hub.publish(`appt:${appointmentId}`, {
              type: "message:read",
              appointmentId,
              by: userId,
            });
          } catch (error) {
            return sendJson(ws, { type: "error", message: error.message || "Failed to mark read." });
          }
          return;
        }

        default:
          return sendJson(ws, { type: "error", message: `Unknown frame type: ${frame.type}` });
      }
    });

    ws.on("close", () => hub.unregister(ws));
    ws.on("error", () => hub.unregister(ws));
  });

  // Heartbeat — prune dead sockets and keep intermediaries honest.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        hub.unregister(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        hub.unregister(ws);
        ws.terminate();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}