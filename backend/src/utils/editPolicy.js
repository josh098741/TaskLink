/**
 * Edit policy
 * ───────────
 * A user may edit a task post or a service they created ONLY while both of the
 * following hold:
 *
 *   1. Less than EDIT_WINDOW_MS (24 hours) has passed since the item was created.
 *   2. Nobody has booked, accepted or scheduled a session for it.
 *
 * Once either condition fails the item is permanently locked, and the reason is
 * surfaced to the client so the UI can explain why the edit button is gone.
 */

// 24 hours in milliseconds.
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Appointment statuses that represent a real booking / scheduled session.
// Anything the provider has not yet committed to (declined, cancelled) does not
// lock editing.
export const BLOCKING_APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "reschedule_requested",
  "completed",
  "no_show",
];

export const EDIT_LOCK_REASONS = {
  BOOKED: "booked",
  EXPIRED: "expired",
  BOTH: "booked_and_expired",
};

/**
 * Has the 24 hour edit window closed for an item?
 *
 * @param {Date|string|number} createdAt
 * @param {number} [now]
 * @returns {boolean}
 */
export function isEditWindowExpired(createdAt, now = Date.now()) {
  if (!createdAt) return false;
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created >= EDIT_WINDOW_MS;
}

/**
 * Resolve the edit state for one item.
 *
 * @param {object} params
 * @param {Date|string|number} params.createdAt  When the item was created.
 * @param {boolean} [params.hasBooking]          True when someone has already
 *                                                booked / accepted it.
 * @param {number} [params.now]
 * @returns {{
 *   canEdit: boolean,
 *   editLocked: boolean,
 *   editLockedReason: string|null,
 *   editWindowExpired: boolean,
 *   hasBooking: boolean,
 *   editWindowEndsAt: string|null,
 * }}
 */
export function resolveEditState({ createdAt, hasBooking = false, now = Date.now() }) {
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt ?? 0).getTime();
  const validCreated = Number.isNaN(created) ? null : created;

  const editWindowExpired = isEditWindowExpired(createdAt, now);
  const canEdit = !editWindowExpired && !hasBooking;

  let editLockedReason = null;
  if (editWindowExpired && hasBooking) {
    editLockedReason = EDIT_LOCK_REASONS.BOTH;
  } else if (editWindowExpired) {
    editLockedReason = EDIT_LOCK_REASONS.EXPIRED;
  } else if (hasBooking) {
    editLockedReason = EDIT_LOCK_REASONS.BOOKED;
  }

  return {
    canEdit,
    editLocked: !canEdit,
    editLockedReason,
    editWindowExpired,
    hasBooking,
    editWindowEndsAt:
      validCreated === null ? null : new Date(validCreated + EDIT_WINDOW_MS).toISOString(),
  };
}

/**
 * Human readable explanation for why an item can no longer be edited.
 *
 * @param {string|null} reason
 * @returns {string}
 */
export function editLockMessage(reason) {
  switch (reason) {
    case EDIT_LOCK_REASONS.BOOKED:
      return "This has already been booked, so its details can no longer be changed.";
    case EDIT_LOCK_REASONS.EXPIRED:
      return "The 24 hour editing window for this item has closed, so it can no longer be changed.";
    case EDIT_LOCK_REASONS.BOTH:
      return "This has been booked and its 24 hour editing window has closed, so it can no longer be changed.";
    default:
      return "This item can no longer be edited.";
  }
}