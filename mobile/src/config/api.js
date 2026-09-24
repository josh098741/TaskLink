/**
 * api.js
 * ──────
 * Central API configuration and authenticated fetch helpers.
 *
 * Usage:
 *   import { apiFetch } from '../config/api';
 *   const data = await apiFetch('/user/me', token);
 */

// ── Base URL ──────────────────────────────────────────────────────────────────
// Switch between local dev and deployed backend.
// Set EXPO_PUBLIC_API_URL in your .env file to override.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://task-link-eight.vercel.app";

// ── Authenticated GET ─────────────────────────────────────────────────────────
// ── Default network timeout ──────────────────────────────────────────────────
// Native `fetch` has no default timeout on React Native, so a slow or
// unreachable backend can hang a request forever. Every apiFetch call is
// aborted after this many ms unless `options.timeoutMs` overrides it.
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

/**
 * apiFetch
 * Makes an authenticated JSON request to the backend.
 *
 * @param {string}  path    - Route path, e.g. '/user/me'
 * @param {string}  token   - access JWT
 * @param {object}  options - Additional fetch options (method, body, etc.)
 * @returns {Promise<object>} Parsed JSON response body
 * @throws {Error} With a human-readable message from the server
 */
export async function apiFetch(path, token, options = {}) {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...requestOptions } = options;
  const url = `${API_BASE_URL}/api${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  let json;
  try {
    res = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(requestOptions.headers ?? {}),
      },
    });
    json = await res.json().catch(() => ({}));
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }

  return json;
}

// ── Fetch my posts ─────────────────────────────────────────────────────────────
/**
 * fetchMyPosts
 * Returns the currently authenticated user's created posts, newest first.
 *
 * @param {string}  token - access JWT
 * @param {object}  extraHeaders - Extra headers
 * @returns {Promise<object[]>} Array of post records
 */
export async function fetchMyPosts(token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts/mine`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.posts ?? [];
}

// ── Browse posts (public) ──────────────────────────────────────────────────────
/**
 * fetchPosts
 * Public browse of available posts. Returns open posts newest first.
 *
 * @param {object}  params - Query params: { category?, status?, q? }
 * @returns {Promise<object[]>} Array of post records
 */
function normalisePhotos(value) {
  if (Array.isArray(value)) {
    return value.filter((photo) => typeof photo === 'string' && photo.trim());
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (/^https?:\/\//i.test(trimmed)) return [trimmed];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed)
      ? parsed.filter((photo) => typeof photo === 'string' && photo.trim())
      : [];
  } catch {
    return [];
  }
}

export async function fetchPosts(params = {}, token = null) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    )
  ).toString();
  const url = `${API_BASE_URL}/api/posts${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return (json.posts ?? []).map((post) => ({
    ...post,
    photos: normalisePhotos(post.photos),
  }));
}

export async function fetchServices(params = {}, token = null) {
  if (!token) return [];

  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    )
  ).toString();
  const json = await apiFetch(`/services${query ? `?${query}` : ""}`, token, {
    method: "GET",
  });
  return (json.services ?? []).map((service) => ({
    ...service,
    type: "service",
    photos: normalisePhotos(service.photos),
  }));
}

// ── Cloudinary upload helper ─────────────────────────────────────────────────
/**
 * uploadPhotosToCloudinary
 * Sends raw image data (data URLs/base64) to the backend, which uploads to
 * Cloudinary and returns the secure URLs.
 *
 * @param {string[]} photos  - Array of base64 / data URL strings
 * @param {string}   token   - access JWT
 * @returns {Promise<string[]>} Cloudinary secure URLs
 */
export async function uploadPhotosToCloudinary(photos, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ photos }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Upload failed with status ${res.status}`);
  }
  return json.urls;
}

// ── Create post helper ───────────────────────────────────────────────────────
/**
 * createPost
 * Creates a new task on the backend.
 *
 * @param {object}  data  - Post payload
 * @param {string}  token - access JWT
 * @returns {Promise<object>} Created post record
 */
export async function createPost(data, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json;
}

export async function uploadServicePhotos(photos, token, extraHeaders = {}) {
  const json = await apiFetch("/services/upload", token, {
    method: "POST",
    timeoutMs: 60000,
    body: JSON.stringify({ photos }),
    headers: extraHeaders,
  });
  return json.urls ?? [];
}

export async function createService(data, token, extraHeaders = {}) {
  const json = await apiFetch("/services", token, {
    method: "POST",
    body: JSON.stringify(data),
    headers: extraHeaders,
  });
  return json.service ?? json;
}

export async function fetchService(id, token = null) {
  const json = await apiFetch(`/services/${encodeURIComponent(id)}`, token, {
    method: "GET",
  });
  return json.service ?? null;
}

// ── Fetch a single post ───────────────────────────────────────────────────────
/**
 * fetchPost
 * Fetches a single post by id. Accepts optional token for authenticated requests.
 *
 * @param {string} id - Post id
 * @param {string} [token] - Optional access JWT
 * @returns {Promise<object>} The post record
 */
export async function fetchPost(id, token = null) {
  const url = `${API_BASE_URL}/api/posts/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.post;
}

// ── Update a post (owner, while open) ─────────────────────────────────────────
/**
 * updatePost
 * Edits a post. Only the owner can edit, and only while the post is still open.
 *
 * @param {string}  id    - Post id
 * @param {object}  data  - Patch payload of editable fields
 * @param {string}  token - access JWT
 * @returns {Promise<object>} Updated post record
 */
export async function updatePost(id, data, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.post;
}

// ── Delete a post (owner, while open) ─────────────────────────────────────────
/**
 * deletePost
 * Deletes a post. Only the owner can delete, and only while it is still open.
 *
 * @param {string}  id    - Post id
 * @param {string}  token - access JWT
 * @returns {Promise<object>} Success payload
 */
export async function deletePost(id, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json;
}

// ── Accept a post (doer) ──────────────────────────────────────────────────────
/**
 * acceptPost
 * A doer accepts an open post, marking it as accepted/taken by them.
 *
 * @param {string}  id    - Post id
 * @param {string}  token - access JWT
 * @returns {Promise<object>} Updated post record
 */
export async function acceptPost(id, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/posts/${encodeURIComponent(id)}/accept`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.post;
}

// ── Popular searches ─────────────────────────────────────────────────────────
/**
 * getPopularSearches
 * Returns the most-searched job terms, ranked by usage.
 *
 * @param {number} limit - Number of terms to return (default 5)
 * @returns {Promise<string[]>} Array of search terms
 */
export async function getPopularSearches(limit = 5) {
  const url = `${API_BASE_URL}/api/search/popular?limit=${limit}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.terms ?? [];
}

// ── Search suggestions (autocomplete) ─────────────────────────────────────────
/**
 * getSearchSuggestions
 * Returns autocomplete suggestions (full words) for a partial query.
 *
 * @param {string} q - Partial search query
 * @returns {Promise<string[]>} Array of full search term suggestions
 */
export async function getSearchSuggestions(q) {
  const url = `${API_BASE_URL}/api/search/suggest?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.suggestions ?? [];
}

// ── Record a completed search ────────────────────────────────────────────────
/**
 * recordSearch
 * Records a completed search term (full words only) on the backend. It does not
 * fire mid-typing — call it once a search is submitted.
 *
 * @param {string} q - The completed search term
 * @returns {Promise<object>} Success payload
 */
export async function recordSearch(q) {
  const url = `${API_BASE_URL}/api/search/record`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json;
}

// ── Update user preferences ──────────────────────────────────────────────────
/**
 * updateUserPreferences
 * Persists notification & work preference toggles to the backend.
 *
 * @param {object}  prefs - { availableForWork?, taskAlerts?, bidNotifications?, smsReceipts? }
 * @param {string}  token - access JWT
 * @returns {Promise<object>} Updated preferences object
 */
export async function updateUserPreferences(prefs, token, extraHeaders = {}) {
  const url = `${API_BASE_URL}/api/user/preferences`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
    body: JSON.stringify(prefs),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json.preferences;
}

// ── Phone validation (shared with backend logic) ──────────────────────────────
/**
 * normalisePhone
 * Client-side mirror of the backend normalisePhone function.
 * Strips all whitespace, hyphens, parentheses, and dots, then validates E.164.
 *
 * Returns { cleaned, error }:
 *  - cleaned: the normalised phone string (e.g. "+254712345678")
 *  - error:   a human-readable error string, or null if valid
 */
export function normalisePhone(raw) {
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return { cleaned: null, error: "Phone number is required." };
  }

  // Strip everything except digits and a leading '+'
  const stripped = raw.trim().replace(/[^\d+]/g, "");

  // Remove any '+' that appears after position 0
  const cleaned = stripped.startsWith("+")
    ? "+" + stripped.slice(1).replace(/\+/g, "")
    : stripped.replace(/\+/g, "");

  if (!cleaned.startsWith("+")) {
    return {
      cleaned: null,
      error: "Include your country code, e.g. +254712345678",
    };
  }

  const digits = cleaned.slice(1);

  if (!/^\d+$/.test(digits)) {
    return {
      cleaned: null,
      error: "Only digits are allowed after the '+' sign.",
    };
  }

  if (digits[0] === "0") {
    return {
      cleaned: null,
      error: "Invalid country code — the digit after '+' cannot be 0.",
    };
  }

  if (digits.length < 7) {
    return {
      cleaned: null,
      error: `Too short — ${digits.length} digit${digits.length === 1 ? "" : "s"} after country code (minimum 7).`,
    };
  }

  if (digits.length > 15) {
    return {
      cleaned: null,
      error: `Too long — ${digits.length} digits (maximum 15 per E.164 standard).`,
    };
  }

  return { cleaned, error: null };
}

// ── Appointments (booking flow & chat links) ───────────────────────────────
/**
 * fetchAppointment
 * Fetches a single appointment by id. Only a participant can load it.
 *
 * @param {string}  id    - Appointment id
 * @param {string}  token - access JWT
 * @returns {Promise<object>} The appointment record
 */
export async function fetchAppointment(id, token) {
  const json = await apiFetch(`/appointments/${encodeURIComponent(id)}`, token, {
    method: "GET",
  });
  return json.appointment ?? null;
}

/**
 * createAppointment
 * Books an appointment for a service. Returns the created appointment.
 *
 * @param {object}  payload - { serviceId, startsAt, timezone, meetingType, location, meetingDetails?, notes?, idempotencyKey? }
 * @param {string}  token   - access JWT
 * @returns {Promise<object>} The created appointment
 */
export async function createAppointment(payload, token) {
  const json = await apiFetch("/appointments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json.appointment ?? json;
}

// ── Chat: threads ──────────────────────────────────────────────────────────
/**
 * fetchChatThreads
 * Returns the authenticated user's appointment threads, newest activity first.
 *
 * @param {string} token - access JWT
 * @returns {Promise<object[]>} Array of thread records
 */
export async function fetchChatThreads(token) {
  const json = await apiFetch("/chat/threads", token, { method: "GET" });
  return json.threads ?? [];
}

/**
 * fetchChatUnread
 * Total unread messages across all threads (drives the app badge).
 *
 * @param {string} token - access JWT
 * @returns {Promise<number>}
 */
export async function fetchChatUnread(token) {
  const json = await apiFetch("/chat/threads/badge", token, { method: "GET" });
  return Number(json.unread ?? 0);
}

/**
 * fetchChatMessages
 * Latest page of messages for a thread, returned oldest-first.
 *
 * @param {string}  appointmentId
 * @param {object}  options - { before?: ISO string, limit?: number }
 * @param {string}  token   - access JWT
 * @returns {Promise<{ messages: object[], olderAvailable: boolean }>}
 */
export async function fetchChatMessages(appointmentId, options = {}, token) {
  const query = new URLSearchParams();
  if (options.before) query.set("before", options.before);
  if (options.limit) query.set("limit", String(options.limit));
  const qs = query.toString();
  const json = await apiFetch(
    `/chat/${encodeURIComponent(appointmentId)}/messages${qs ? `?${qs}` : ""}`,
    token,
    { method: "GET" }
  );
  return { messages: json.messages ?? [], olderAvailable: !!json.olderAvailable };
}

/**
 * sendChatMessage
 * Sends a message to an appointment thread.
 *
 * @param {string} appointmentId
 * @param {string} body
 * @param {string} token
 * @returns {Promise<object>} The stored message (with server id)
 */
export async function sendChatMessage(appointmentId, body, token) {
  const json = await apiFetch(`/chat/${encodeURIComponent(appointmentId)}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return json.message ?? json;
}

/**
 * markChatRead
 * Marks every message written by the other participant as read.
 *
 * @param {string} appointmentId
 * @param {string} token
 * @returns {Promise<number>} Number of messages newly marked read
 */
export async function markChatRead(appointmentId, token) {
  const json = await apiFetch(`/chat/${encodeURIComponent(appointmentId)}/read`, token, {
    method: "POST",
  });
  return Number(json.marked ?? 0);
}

// ── Push notifications ─────────────────────────────────────────────────────
/**
 * registerPushToken
 * Registers (null clears) the device's Expo push token with the backend.
 *
 * @param {string|null} expoPushToken
 * @param {string} token - access JWT
 */
export async function registerPushToken(expoPushToken, token) {
  const json = await apiFetch("/user/push-token", token, {
    method: "PATCH",
    body: JSON.stringify({ expoPushToken }),
  });
  return json.registered === true;
}

// ── Analytics: session tracking + admin summary ────────────────────────────
/**
 * reportSession
 * Records a session lifecycle event from the ActivityBridge.
 *
 * @param {object}  payload - { action: 'start'|'heartbeat'|'end', sessionId, startedAt, endedAt?, platform?, appVersion? }
 * @param {string}  token   - access JWT
 * @returns {Promise<object>} Success payload (includes durationSeconds for `end`)
 */
export async function reportSession(payload, token) {
  return apiFetch("/analytics/session", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * fetchAnalyticsSummary
 * Admin-only dashboard payload (403 for non-admins).
 *
 * @param {string} token - access JWT
 * @returns {Promise<object>} { totals, recentSessions, lastSeen }
 */
export async function fetchAnalyticsSummary(token) {
  return apiFetch("/analytics/summary", token, { method: "GET" });
}
