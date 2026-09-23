/**
 * chatValidation.js
 * ─────────────────
 * Shared validation helpers for appointment-scoped chat. These are pure
 * functions so they are unit-testable without a running server.
 */

export const MAX_MESSAGE_LENGTH = 4000;
export const DEFAULT_MESSAGE_LIMIT = 50;
export const MAX_MESSAGE_LIMIT = 100;

/**
 * validateMessageBody
 * Trims and validates a chat message body.
 *
 * @param {unknown} raw - Incoming body value.
 * @returns {string} The trimmed message.
 * @throws {Error} If it is missing, not a string, or too long.
 */
export function validateMessageBody(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Message cannot be empty.");
  }
  if (raw.trim().length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
  }
  return raw.trim();
}

/**
 * parseMessagesPagination
 * Parses `limit` / `before` query values for the message list endpoint.
 *
 * @param {object} query - req.query bag.
 * @returns {{ limit: number, before: string | null }}
 * @throws {Error} If values are malformed.
 */
export function parseMessagesPagination(query = {}) {
  const rawLimit = query.limit == null ? "" : String(query.limit).trim();
  const rawBefore = query.before == null ? "" : String(query.before).trim();

  let limit = DEFAULT_MESSAGE_LIMIT;
  if (rawLimit) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MESSAGE_LIMIT) {
      throw new Error(`limit must be an integer between 1 and ${MAX_MESSAGE_LIMIT}.`);
    }
  }

  let before = null;
  if (rawBefore) {
    const parsed = new Date(rawBefore);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("before must be a valid ISO date string.");
    }
    before = parsed.toISOString();
  }

  return { limit, before };
}