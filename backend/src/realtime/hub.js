/**
 * hub.js
 * ──────
 * In-process pub/sub for chat events. A hub instance knows every live
 * WebSocket connection and which appointment channels it has subscribed to,
 * and broadcasts chat events to the right sockets instantly.
 *
 * When Upstash Redis is configured, `publish` also pushes the event into a
 * single Redis channel. Each deployed Vercel function instance runs one
 * cross-instance bridge (SSE subscriber) that re-broadcasts messages it did
 * not originate — this is what lets user A (function instance 1) reach user B
 * (function instance 2). Without Redis the hub still works perfectly on a
 * single instance (local dev / a single running Node process).
 *
 * Events flowing through the hub:
 *   { type: "message:new",  appointmentId, message }
 *   { type: "message:read", appointmentId, by }
 *   { type: "typing",       appointmentId, by }
 *
 * The channel key equals the appointmentId.
 */

const BRIDGE_CHANNEL = "chatlink:events";

export function createHub(redis = null) {
  // socket -> { userId, channels: Set<string> }
  const connections = new Map();
  // channel -> Set<socket>
  const channels = new Map();

  function register(ws, userId) {
    connections.set(ws, { userId, channels: new Set() });
    if (!channels.has(userId)) channels.set(userId, new Set());
    channels.get(userId).add(ws);
  }

  function unregister(ws) {
    const entry = connections.get(ws);
    if (entry) {
      for (const channel of entry.channels) {
        const members = channels.get(channel);
        members?.delete(ws);
        if (members?.size === 0) channels.delete(channel);
      }
      // userId bookkeeping (userId -> sockets)
      const byUser = channels.get(entry.userId);
      byUser?.delete(ws);
      if (byUser?.size === 0) channels.delete(entry.userId);
      connections.delete(ws);
    }
  }

  function join(ws, channel) {
    const entry = connections.get(ws);
    if (!entry) return;
    entry.channels.add(channel);
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel).add(ws);
  }

  function leave(ws, channel) {
    const entry = connections.get(ws);
    entry?.channels.delete(channel);
    const members = channels.get(channel);
    members?.delete(ws);
    if (members?.size === 0) channels.delete(channel);
  }

  /**
   * sendToSocket — deliver an event as JSON to a single connected socket.
   */
  function sendToSocket(ws, event) {
    if (ws.readyState === ws.OPEN || ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(event));
      } catch {
        /* socket may be mid-close; its lifecycle handles cleanup */
      }
    }
  }

  /**
   * broadcastLocal — relay an event to every local socket subscribed to a
   * channel, optionally skipping one socket (e.g. the sender of a typing
   * indicator).
   */
  function broadcastLocal(channel, event, excludeSocket = null) {
    const members = channels.get(channel);
    if (!members) return;
    for (const ws of members) {
      if (ws === excludeSocket) continue;
      sendToSocket(ws, event);
    }
  }

  /**
   * publish — broadcast locally and (if Redis is configured) to other
   * instances so their bridges can relay to their own local sockets.
   */
  function publish(channel, event) {
    broadcastLocal(channel, event);
    if (redis) {
      redis.publish(BRIDGE_CHANNEL, JSON.stringify({ channel, event })).catch(() => {});
    }
  }

  /**
   * hasUser — true when the given user has at least one live socket on THIS
   * instance. Used to decide whether a push notification should be sent
   * (the realtime path already covered them locally).
   */
  function hasUser(userId) {
    const sockets = channels.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * startBridge — subscribe to the shared Redis channel and re-broadcast
   * cross-instance events locally. Idempotent: only one bridge per process.
   */
  let bridgeStarted = false;
  function startBridge() {
    if (!redis || bridgeStarted) return;
    bridgeStarted = true;
    try {
      redis.subscribe([BRIDGE_CHANNEL]).on("message", (data) => {
        try {
          const raw = typeof data === "string" ? data : data?.message;
          const parsed = JSON.parse(raw);
          if (parsed?.channel && parsed?.event) {
            broadcastLocal(parsed.channel, parsed.event);
          }
        } catch {
          /* ignore malformed frames */
        }
      });
    } catch (error) {
      console.warn("[hub] Redis bridge could not start:", error.message);
      bridgeStarted = false;
    }
  }

  return {
    register,
    unregister,
    join,
    leave,
    publish,
    broadcastLocal,
    hasUser,
    startBridge,
    // expose for diagnostics/tests
    get listeners() {
      return connections.size;
    },
  };
}