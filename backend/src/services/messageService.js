/**
 * messageService.js
 * ─────────────────
 * Persistence + domain logic for appointment-scoped chat. Used by both the
 * REST chat controller (chatController.js) and the WebSocket handler
 * (ws/server.js) so the two transports share one source of truth.
 *
 * A conversation is scoped 1:1 to an appointment — only the provider and the
 * client of that appointment can ever talk.
 */

import { and, asc, count, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  appointments,
  chatMessages,
  serviceOfferings,
  users,
} from "../db/schema.js";
import { generateId } from "../utils/id.js";
import { MAX_MESSAGE_LENGTH, validateMessageBody } from "../utils/chatValidation.js";

const MAX_THREADS = 50;

/**
 * assertAppointmentParticipant
 * Loads an appointment and confirms the user is the provider or client.
 *
 * @returns {Promise<object>} The appointment row.
 * @throws {{status:number, message:string}}
 */
export async function assertAppointmentParticipant(appointmentId, userId) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, String(appointmentId).trim()))
    .limit(1);
  if (!row) {
    const error = new Error("Appointment not found.");
    error.status = 404;
    throw error;
  }
  const isProvider = row.providerId === userId;
  const isClient = row.clientId === userId;
  if (!isProvider && !isClient) {
    const error = new Error("You are not a participant in this appointment.");
    error.status = 403;
    throw error;
  }
  return row;
}

/**
 * serializeMessage
 * Converts a chat_messages row into the API shape.
 */
export function serializeMessage(row) {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    senderId: row.senderId,
    body: row.body,
    deliveredAt: row.deliveredAt instanceof Date ? row.deliveredAt.toISOString() : row.deliveredAt,
    readAt: row.readAt instanceof Date ? row.readAt.toISOString() : row.readAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

/**
 * otherParticipant
 * Given an appointment row + the current user, returns the id of the other
 * participant (the person a message should be pushed to).
 */
export function otherParticipant(row, userId) {
  return row.providerId === userId ? row.clientId : row.providerId;
}

/**
 * saveMessage
 * Persists a message and returns { appointment, message }.
 *
 * @param {string} appointmentId
 * @param {string} senderId
 * @param {string} body - Validated here by default.
 */
export async function saveMessage(appointmentId, senderId, body, { validate = true } = {}) {
  const appointment = await assertAppointmentParticipant(appointmentId, senderId);
  const clean = validate ? validateMessageBody(body) : body;

  if (!clean || clean.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
    error.status = 400;
    throw error;
  }

  const now = new Date();
  const [created] = await db
    .insert(chatMessages)
    .values({
      id: generateId("msg"),
      appointmentId: appointment.id,
      senderId,
      body: clean,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { appointment, message: serializeMessage(created) };
}

/**
 * listMessages
 * Returns the most recent messages in a thread, oldest → newest. When a user
 * loads a thread we also mark every incoming (not-yet-delivered) message as
 * delivered — the client sends an explicit "read" call when the user actually
 * sees it.
 *
 * @returns {Promise<{ messages: object[], olderAvailable: boolean }>}
 */
export async function listMessages(appointmentId, userId, { limit = 50, before = null } = {}) {
  await assertAppointmentParticipant(appointmentId, userId);

  const conditions = [eq(chatMessages.appointmentId, appointmentId)];
  if (before) conditions.push(lt(chatMessages.createdAt, new Date(before)));

  // Pull one extra row to know whether there is older history to page.
  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit + 1);

  const olderAvailable = rows.length > limit;
  const page = rows.slice(0, limit).reverse();

  // Mark incoming messages delivered (no-op on already-read rows).
  const incomingNotDelivered = page
    .filter((m) => m.senderId !== userId && m.deliveredAt === null)
    .map((m) => m.id);
  if (incomingNotDelivered.length > 0) {
    const now = new Date();
    await db
      .update(chatMessages)
      .set({ deliveredAt: now })
      .where(inArray(chatMessages.id, incomingNotDelivered));
  }

  return {
    olderAvailable,
    messages: page
      .map((m) => {
        if (m.senderId !== userId && m.deliveredAt === null) m.deliveredAt = new Date();
        return serializeMessage(m);
      })
      .map((m) => {
        if (m.senderId !== userId && m.deliveredAt === null) m.deliveredAt = new Date().toISOString();
        return m;
      }),
  };
}

/**
 * markThreadRead
 * Marks every message written by the other participant as read (and delivered).
 *
 * @returns {Promise<{ appointment: object, marked: number }>}
 */
export async function markThreadRead(appointmentId, userId) {
  const appointment = await assertAppointmentParticipant(appointmentId, userId);

  const now = new Date();
  const updated = await db
    .update(chatMessages)
    .set({ readAt: now, deliveredAt: now })
    .where(and(
      eq(chatMessages.appointmentId, appointmentId),
      ne(chatMessages.senderId, userId),
      isNull(chatMessages.readAt)
    ))
    .returning({ id: chatMessages.id });

  return { appointment, marked: updated.length };
}

/**
 * listThreads
 * Returns the current user's appointment threads (newest activity first) with
 * the person on the other side, the service label, the last message preview
 * and the number of unread messages.
 *
 * @returns {Promise<object[]>}
 */
export async function listThreads(userId) {
  const appointmentRows = await db
    .select()
    .from(appointments)
    .where(or(
      eq(appointments.providerId, userId),
      eq(appointments.clientId, userId)
    ))
    .orderBy(desc(appointments.updatedAt))
    .limit(MAX_THREADS);

  if (appointmentRows.length === 0) return [];

  const ids = appointmentRows.map((row) => row.id);

  const [messageRows, unreadRows, serviceRows, userRows] = await Promise.all([
    db
      .select()
      .from(chatMessages)
      .where(inArray(chatMessages.appointmentId, ids))
      .orderBy(asc(chatMessages.createdAt)),
    db
      .select({ appointmentId: chatMessages.appointmentId })
      .from(chatMessages)
      .where(and(
        inArray(chatMessages.appointmentId, ids),
        ne(chatMessages.senderId, userId),
        isNull(chatMessages.readAt)
      )),
    db
      .select()
      .from(serviceOfferings)
      .where(inArray(serviceOfferings.id, appointmentRows.map((r) => r.serviceId))),
    db
      .select()
      .from(users)
      .where(inArray(
        users.id,
        appointmentRows.flatMap((r) => [r.providerId, r.clientId])
      )),
  ]);

  const servicesById = new Map(serviceRows.map((r) => [r.id, r]));
  const usersById = new Map(userRows.map((r) => [r.id, r]));

  const unreadByAppointment = new Map();
  for (const row of unreadRows) {
    unreadByAppointment.set(
      row.appointmentId,
      (unreadByAppointment.get(row.appointmentId) ?? 0) + 1
    );
  }

  // Per-appointment newest message (rows are old → new).
  const latestByAppointment = new Map();
  for (const row of messageRows) {
    latestByAppointment.set(row.appointmentId, row);
  }

  const threads = [];
  for (const row of appointmentRows) {
    const service = servicesById.get(row.serviceId);
    const otherId = row.providerId === userId ? row.clientId : row.providerId;
    const other = usersById.get(otherId);
    const latest = latestByAppointment.get(row.id);

    threads.push({
      appointmentId: row.id,
      status: row.status,
      startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : row.startsAt,
      endsAt: row.endsAt instanceof Date ? row.endsAt.toISOString() : row.endsAt,
      timezone: row.timezone,
      service: service
        ? {
            id: service.id,
            title: service.title,
            category: service.category,
            location: service.location,
          }
        : null,
      other: other
        ? {
            id: other.id,
            firstName: other.firstName,
            lastName: other.lastName,
            imageUrl: other.imageUrl,
            location: other.location,
          }
        : null,
      lastMessage: latest
        ? {
            body: latest.body,
            senderId: latest.senderId,
            createdAt: latest.createdAt instanceof Date
              ? latest.createdAt.toISOString()
              : latest.createdAt,
            readAt: latest.readAt instanceof Date ? latest.readAt.toISOString() : latest.readAt,
            deliveredAt: latest.deliveredAt instanceof Date
              ? latest.deliveredAt.toISOString()
              : latest.deliveredAt,
          }
        : null,
      unreadCount: unreadByAppointment.get(row.id) ?? 0,
    });
  }

  // Newest activity first, mirroring a classic messaging app.
  return threads.sort((a, b) => {
    const aTime = new Date(a.lastMessage?.createdAt ?? a.startsAt ?? 0).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.startsAt ?? 0).getTime();
    return bTime - aTime;
  });
}

/**
 * countUnreadMessages
 * Total number of unread messages across all of a user's appointments.
 * Used for the badge on the Messages entry point.
 */
export async function countUnreadMessages(userId) {
  const appointmentRows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(or(
      eq(appointments.providerId, userId),
      eq(appointments.clientId, userId)
    ))
    .limit(MAX_THREADS * 8);

  if (appointmentRows.length === 0) return 0;

  const [row] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(and(
      inArray(
        chatMessages.appointmentId,
        appointmentRows.map((r) => r.id)
      ),
      ne(chatMessages.senderId, userId),
      isNull(chatMessages.readAt)
    ));

  return Number(row?.unread ?? 0);
}