/**
 * socket.js
 * ─────────
 * A single authenticated WebSocket connection to the backend's chat endpoint,
 * shared by every chat screen in the app.
 *
 * Responsibilities:
 *   • connect / disconnect lifecycle driven by the authenticated session
 *   • automatic reconnect with exponential backoff (1s → 30s cap)
 *   • resubscribe to all active threads after a reconnect
 *   • dispatch inbound events to per-thread listeners
 *
 * The backend closes connections when a Vercel function recycles (expected,
 * per the WebSocket beta), so reconnecting and resubscribing is a normal part
 * of this client, not an error path.
 */

import { API_BASE_URL } from './api';

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30000;

function wsUrl(token) {
  const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
  const base = API_BASE_URL.replace(/^https?:\/\//, '');
  return `${protocol}://${base}/ws?token=${encodeURIComponent(token)}`;
}

class SocketManager {
  constructor() {
    this.ws = null;
    this.token = null;
    this.status = 'idle'; // idle | connecting | live | reconnecting | off
    this.listeners = new Map(); // appointmentId -> Set<handler>
    this.reconnectDelay = RECONNECT_MIN_MS;
    this.reconnectTimer = null;
    this.manualClose = false;
    this.pingTimer = null;
    this.statusHandlers = new Set();
  }

  /** connect(token) — begin (or refresh) a session with the given JWT. */
  connect(token) {
    if (!token) return;
    this.manualClose = false;
    this.token = token;

    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return; // already connecting / open
    }
    this._open();
  }

  /** disconnect() — cleanly tear down the socket (e.g. on logout). */
  disconnect() {
    this.manualClose = true;
    this._clearTimers();
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        /* noop */
      }
      this.ws = null;
    }
    this._setStatus('off');
  }

  _open() {
    this._setStatus(this.reconnectTimer ? 'reconnecting' : 'connecting');
    let ws;
    try {
      ws = new WebSocket(wsUrl(this.token));
    } catch (_error) {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = RECONNECT_MIN_MS;
      this._setStatus('live');
      // Re-establish every active subscription.
      for (const appointmentId of this.listeners.keys()) {
        this._send({ type: 'subscribe', appointmentId });
      }
      this._startPing();
    };

    ws.onmessage = (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      const appointmentId = frame?.appointmentId;
      const handlers = appointmentId ? this.listeners.get(appointmentId) : null;
      if (!handlers) return;
      for (const handler of handlers) {
        try {
          handler(frame);
        } catch {
          /* listener bug must not kill the socket */
        }
      }
    };

    ws.onerror = (_error) => {
      /* onclose handles the retry */
    };

    ws.onclose = () => {
      this._clearTimers();
      if (this.manualClose) return;
      this.ws = null;
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    this._setStatus('reconnecting');
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.manualClose || !this.token) return;
      this._open();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      RECONNECT_MAX_MS
    );
  }

  _startPing() {
    this._clearTimers();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        this._send({ type: 'ping' });
      }
    }, 25000);
  }

  _clearTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  _send(frame) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  /** subscribe(appointmentId, handler) — returns an unsubscribe function. */
  subscribe(appointmentId, handler) {
    if (!this.listeners.has(appointmentId)) {
      this.listeners.set(appointmentId, new Set());
      this._send({ type: 'subscribe', appointmentId });
    }
    this.listeners.get(appointmentId).add(handler);
    return () => {
      const set = this.listeners.get(appointmentId);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(appointmentId);
        // No explicit unsubscribe frame needed; the server tolerates stale
        // subscriptions and cleans up on close.
      }
    };
  }

  /** sendMessage — send a chat message over the socket. */
  sendMessage(appointmentId, body) {
    this._send({ type: 'message', appointmentId, body });
  }

  /** sendTyping — tell the other participant the user is typing. */
  sendTyping(appointmentId) {
    this._send({ type: 'typing', appointmentId });
  }

  /** markRead — tell the other participant the thread was read. */
  markRead(appointmentId) {
    this._send({ type: 'read', appointmentId });
  }

  onStatus(handler) {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  _setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch {
        /* noop */
      }
    }
  }
}

export const socketManager = new SocketManager();