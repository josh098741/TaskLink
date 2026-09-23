/**
 * id.js
 * ─────
 * Generates collision-resilient, URL-safe ids (no dashes) for new rows.
 */

export function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}