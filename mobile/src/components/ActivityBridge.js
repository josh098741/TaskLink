/**
 * ActivityBridge.js
 * ─────────────────
 * Never renders anything. Sits inside AuthProvider and turns the app's
 * lifecycle into first-party analytics events (POST /api/analytics/session):
 *
 *   foreground → start a session + 60s heartbeats
 *   background → end the session
 *   OS kill    → the open session was persisted to AsyncStorage first, then
 *                replayed (as `end`, at its last known time) on next launch
 *
 * It is deliberately fail-silent: a flaky network, an expired token, or a
 * dead backend never crashes or blocks the app. Every persistence + network
 * step is fire-and-forget.
 */

import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useAuth } from "../contexts/AuthContext";
import { reportSession } from "../config/api";

const PENDING_KEY = "tasklink_pending_session";
const HEARTBEAT_MS = 60_000;
const RETRY_ATTEMPTS = 1;

let session = null;

function makeSessionId() {
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function baseContext() {
  return {
    platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "other",
    appVersion: Constants.expoConfig?.version ?? null,
  };
}

/**
 * Persists the open session so an OS kill is never lost. This happens BEFORE
 * any network call; if the app dies mid-request the row is replayed on boot.
 */
async function persistSession() {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(session));
  } catch (_err) {
    // AsyncStorage full / unavailable — best-effort only.
  }
}

async function clearPending() {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (_err) {
    /* ignore */
  }
}

export default function ActivityBridge() {
  const { token, refresh } = useAuth();
  const tokenRef = useRef(token);
  const prevTokenRef = useRef(token);
  const busyRef = useRef(false);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  /**
   * send
   * Fire-and-forget lifecycle event with one refresh-and-retry on 401 (the
   * access JWT is short-lived). Keeps the pending row when it ultimately
   * fails so the next launch replays it.
   */
  async function send(action, extra = {}) {
    if (!session) return null;
    let lastError = null;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const t = tokenRef.current;
        if (!t) throw new Error("no token");
        const resp = await reportSession(
          {
            action,
            sessionId: session.id,
            startedAt: session.startedAt,
            ...baseContext(),
            ...extra,
          },
          t
        );
        return resp;
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          try {
            await refresh(); // may rotate token; refreshSession is tolerant
          } catch (_err) {
            /* stale session — give up silently */
          }
        }
      }
    }
    console.log("[ActivityBridge] stat beacon failed (kept for replay):", lastError?.message);
    return null;
  }

  async function beginSession() {
    session = {
      id: makeSessionId(),
      startedAt: new Date().toISOString(),
      lastKnownAt: new Date().toISOString(),
    };
    await persistSession();
    await send("start");
  }

  async function heartbeat() {
    if (!session) await beginSession();
    if (!session) return;
    session.lastKnownAt = new Date().toISOString();
    await persistSession();
    await send("heartbeat");
  }

  /**
   * endSession
   * Attempts to close the session at the current time. Pending is only cleared
   * on a confirmed server response; otherwise it replays on next launch.
   */
  async function endSession() {
    if (!session) return;
    const endedAt = new Date().toISOString();
    session.lastKnownAt = endedAt;
    await persistSession();
    const resp = await send("end", { endedAt });
    if (resp) {
      session = null;
      await clearPending();
    }
  }

  // ─── Boot: replay a killed session, then start a fresh one ───────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const raw = await AsyncStorage.getItem(PENDING_KEY);
        if (!cancelled && raw) {
          try {
            const pending = JSON.parse(raw);
            if (pending?.id && pending?.startedAt) {
              const lastKnownAt = pending.lastKnownAt ?? new Date().toISOString();
              session = { id: pending.id, startedAt: pending.startedAt, lastKnownAt };
              const resp = await send("end", { endedAt: lastKnownAt });
              if (resp) {
                session = null;
                await clearPending();
              }
            }
          } catch (_err) {
            // Corrupt payload — trampoline past it.
            await clearPending();
          }
        }
        if (!cancelled && !session) await beginSession();
      } finally {
        busyRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local singleton helpers
  }, [token]);

  // ─── AppState: background ends, foreground (re)starts ────────────────────
  // Local functions are module-scoped singletons — their identity never
  // changes, so empty deps are intentional.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (busyRef.current && next === "active") return;
      if (next === "active") {
        if (session) heartbeat();
        else beginSession();
      } else if (next === "background" || next === "inactive") {
        endSession();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local singleton helpers
  }, []);

  // ─── Heartbeat while foregrounded ─────────────────────────────────────────
  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      const state = AppState.currentState;
      if (session && (state === "active")) heartbeat();
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local singleton helpers
  }, [token]);

  // ─── Logout: close the session for the outgoing user ─────────────────────
  useEffect(() => {
    if (prevTokenRef.current && !token) {
      endSession();
    }
    prevTokenRef.current = token;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local singleton helpers
  }, [token]);

  return null;
}