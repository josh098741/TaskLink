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
/**
 * apiFetch
 * Makes an authenticated JSON request to the backend.
 *
 * @param {string}  path    - Route path, e.g. '/user/me'
 * @param {string}  token   - Clerk session JWT
 * @param {object}  options - Additional fetch options (method, body, etc.)
 * @returns {Promise<object>} Parsed JSON response body
 * @throws {Error} With a human-readable message from the server
 */
export async function apiFetch(path, token, options = {}) {
  const url = `${API_BASE_URL}/api${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }

  return json;
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
