import { v2 as cloudinary } from "cloudinary";
import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  inArray,
  gt,
  isNull,
  ne,
} from "drizzle-orm";
import { db } from "../db/index.js";
import {
  appointments,
  serviceAvailabilities,
  serviceOfferings,
  users,
} from "../db/schema.js";
import { env } from "../utils/env.js";
import {
  APPOINTMENT_STATUSES,
  hasOverlap,
  isWithinAvailability,
  normaliseIdempotencyKey,
  optionalText,
  parseIsoDate,
  validateAppointmentTimes,
  validateAvailabilityPayload,
  validateCancellationReason,
  validateMeetingDetails,
  validateReschedulePayload,
  validateServicePayload,
} from "../utils/serviceValidation.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "reschedule_requested"];
const MAX_SERVICE_RESULTS = 50;

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseJsonArray(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return typeof value === "string" ? value : fallback;
  }
}

function serviceToPayload(row) {
  return {
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    serviceMode: row.serviceMode,
    priceAmount: row.priceAmount,
    currency: row.currency,
    priceType: row.priceType,
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    bookingEnabled: row.bookingEnabled,
    bookingMode: row.bookingMode,
    minNoticeMinutes: row.minNoticeMinutes,
    maxAdvanceBookingDays: row.maxAdvanceBookingDays,
    maxConcurrentBookings: row.maxConcurrentBookings,
    status: row.status,
    photos: parseJsonArray(row.photos, []),
    skills: parseJsonArray(row.skills, []),
  };
}

function serializeService(row, options = {}) {
  const {
    provider,
    availability,
    isOwner = false,
    includeDeleted = false,
  } = options;
  const service = {
    id: row.id,
    providerId: row.providerId,
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    serviceMode: row.serviceMode,
    priceAmount: row.priceAmount ?? null,
    currency: row.currency,
    priceType: row.priceType,
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    bookingEnabled: row.bookingEnabled,
    bookingMode: row.bookingMode,
    minNoticeMinutes: row.minNoticeMinutes,
    maxAdvanceBookingDays: row.maxAdvanceBookingDays,
    maxConcurrentBookings: row.maxConcurrentBookings,
    status: row.status,
    photos: parseJsonArray(row.photos, []),
    skills: parseJsonArray(row.skills, []),
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isOwner,
  };

  if (includeDeleted) service.deletedAt = row.deletedAt ?? null;
  if (availability) service.availability = availability;
  if (provider) {
    service.provider = {
      id: provider.id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      imageUrl: provider.imageUrl,
      location: provider.location,
    };
  }

  return service;
}

function serializeAvailability(row) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    timezone: row.timezone,
    isActive: row.isActive,
  };
}

function serializeUserSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    imageUrl: row.imageUrl,
    location: row.location,
  };
}

function serializeAppointment(row, options = {}) {
  const { service, provider, client } = options;
  return {
    id: row.id,
    serviceId: row.serviceId,
    providerId: row.providerId,
    clientId: row.clientId,
    startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : row.startsAt,
    endsAt: row.endsAt instanceof Date ? row.endsAt.toISOString() : row.endsAt,
    timezone: row.timezone,
    status: row.status,
    meetingType: row.meetingType,
    location: row.location,
    meetingDetails: row.meetingDetails,
    notes: row.notes,
    providerNotes: row.providerNotes,
    priceAmount: row.priceAmount ?? null,
    currency: row.currency,
    paymentStatus: row.paymentStatus,
    cancellationReason: row.cancellationReason,
    rescheduleReason: row.rescheduleReason,
    proposedStartsAt: row.proposedStartsAt instanceof Date
      ? row.proposedStartsAt.toISOString()
      : row.proposedStartsAt,
    proposedEndsAt: row.proposedEndsAt instanceof Date
      ? row.proposedEndsAt.toISOString()
      : row.proposedEndsAt,
    rescheduleRequestedBy: row.rescheduleRequestedBy,
    idempotencyKey: row.idempotencyKey,
    version: row.version,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    confirmedAt: row.confirmedAt instanceof Date ? row.confirmedAt.toISOString() : row.confirmedAt,
    cancelledAt: row.cancelledAt instanceof Date ? row.cancelledAt.toISOString() : row.cancelledAt,
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : row.completedAt,
    noShowAt: row.noShowAt instanceof Date ? row.noShowAt.toISOString() : row.noShowAt,
    service: service ? {
      id: service.id,
      title: service.title,
      category: service.category,
      location: service.location,
      serviceMode: service.serviceMode,
      priceAmount: service.priceAmount ?? null,
      currency: service.currency,
      priceType: service.priceType,
      durationMinutes: service.durationMinutes,
      bookingMode: service.bookingMode,
    } : null,
    provider: serializeUserSummary(provider),
    client: serializeUserSummary(client),
  };
}

async function requireOnboardedUser(userId) {
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      location: users.location,
      role: users.role,
      isOnboarded: users.isOnboarded,
      availableForWork: users.availableForWork,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;
  if (!user.isOnboarded) return { ...user, error: "Complete onboarding before offering services." };
  return user;
}

async function loadUsers(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      location: users.location,
    })
    .from(users)
    .where(inArray(users.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadServices(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(serviceOfferings)
    .where(inArray(serviceOfferings.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadAvailability(serviceIds, activeOnly = false) {
  const uniqueIds = [...new Set(serviceIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const conditions = [inArray(serviceAvailabilities.serviceId, uniqueIds)];
  if (activeOnly) conditions.push(eq(serviceAvailabilities.isActive, true));
  const rows = await db
    .select()
    .from(serviceAvailabilities)
    .where(and(...conditions))
    .orderBy(
      asc(serviceAvailabilities.dayOfWeek),
      asc(serviceAvailabilities.startTime),
      asc(serviceAvailabilities.id)
    );

  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.serviceId) ?? [];
    current.push(serializeAvailability(row));
    grouped.set(row.serviceId, current);
  }
  return grouped;
}

async function loadServiceAvailability(serviceId, activeOnly = false) {
  const grouped = await loadAvailability([serviceId], activeOnly);
  return grouped.get(serviceId) ?? [];
}

async function getVisibleService(id, userId) {
  const [row] = await db
    .select()
    .from(serviceOfferings)
    .where(eq(serviceOfferings.id, id))
    .limit(1);
  if (!row || row.deletedAt || (row.status !== "active" && row.providerId !== userId)) {
    return null;
  }
  return row;
}

async function assertActiveService(service) {
  if (!service || service.deletedAt) return "Service not found.";
  if (service.status !== "active") return "Service is not currently available.";
  if (!service.bookingEnabled) return "Booking is disabled for this service.";
  return null;
}

async function assertCanActivate(provider, payload, hasAvailability) {
  if (payload.status !== "active") return null;
  if (!provider.availableForWork) {
    return "Set yourself as available for work before publishing a service.";
  }
  if (payload.bookingEnabled && payload.durationMinutes === null) {
    return "durationMinutes is required for an active bookable service.";
  }
  if (payload.bookingEnabled && !hasAvailability) {
    return "Add at least one availability window before publishing.";
  }
  return null;
}

function parsePositiveInt(value, fallback, min, max, field) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function validationError(res, error) {
  return res.status(400).json({ error: error.message || "Invalid request." });
}

function buildAvailabilityQueries(serviceId, value) {
  const windows = validateAvailabilityPayload(value);
  const queries = [
    db.delete(serviceAvailabilities).where(eq(serviceAvailabilities.serviceId, serviceId)),
  ];
  if (windows.length > 0) {
    queries.push(db.insert(serviceAvailabilities).values(
      windows.map((window) => ({
        id: generateId("avail"),
        serviceId,
        dayOfWeek: window.dayOfWeek,
        startTime: window.startTime,
        endTime: window.endTime,
        timezone: window.timezone,
        isActive: true,
      }))
    ));
  }
  return { queries, windows };
}

async function replaceAvailability(serviceId, value) {
  const { queries, windows } = buildAvailabilityQueries(serviceId, value);
  await db.batch(queries);
  return windows;
}

async function appointmentRowsForService(serviceId, excludedId = null) {
  const conditions = [
    eq(appointments.serviceId, serviceId),
    inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
  ];
  if (excludedId) conditions.push(ne(appointments.id, excludedId));
  return db
    .select()
    .from(appointments)
    .where(and(...conditions));
}

function extractUploadData(photo) {
  if (!photo || typeof photo !== "string") {
    throw new Error("Each photo must be a non-empty string.");
  }
  if (photo.length > 12 * 1024 * 1024) {
    throw new Error("One of the images is too large.");
  }
  return photo;
}

const uploadPhotos = async (req, res) => {
  const photos = req.body?.photos;
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: "photos must be a non-empty array." });
  }
  if (photos.length > 5) {
    return res.status(400).json({ error: "A maximum of 5 photos is allowed." });
  }

  let dataUrls;
  try {
    dataUrls = photos.map(extractUploadData);
  } catch (error) {
    return validationError(res, error);
  }

  try {
    const urls = [];
    for (const dataUrl of dataUrls) {
      const result = await cloudinary.uploader.upload(dataUrl, {
        folder: "tasklink/services",
        resource_type: "image",
        format: "webp",
        transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
      });
      urls.push(result.secure_url);
    }
    return res.status(200).json({ urls });
  } catch (error) {
    console.error("[uploadServicePhotos] Cloudinary error:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload photo. Please try again.",
    });
  }
};

const createService = async (req, res) => {
  const provider = await requireOnboardedUser(req.auth?.userId);
  if (!provider) return res.status(404).json({ error: "Provider account not found." });
  if (provider.error) return res.status(403).json({ error: provider.error });

  let payload;
  try {
    payload = validateServicePayload(req.body, false);
  } catch (error) {
    return validationError(res, error);
  }

  const availabilityInput = req.body?.availability;
  let availability = [];
  try {
    if (availabilityInput !== undefined) availability = validateAvailabilityPayload(availabilityInput);
  } catch (error) {
    return validationError(res, error);
  }

  if (payload.status === "active" && payload.bookingEnabled && availability.length === 0) {
    return res.status(400).json({ error: "Add at least one availability window before publishing." });
  }

  const activationError = await assertCanActivate(provider, payload, availability.length > 0);
  if (activationError) return res.status(409).json({ error: activationError });

  const now = new Date();
  const serviceId = generateId("service");
  const queries = [
    db.insert(serviceOfferings).values({
      id: serviceId,
      providerId: req.auth.userId,
      title: payload.title,
      category: payload.category,
      description: payload.description,
      location: payload.location,
      serviceMode: payload.serviceMode,
      priceAmount: payload.priceAmount,
      currency: payload.currency,
      priceType: payload.priceType,
      durationMinutes: payload.durationMinutes,
      bufferMinutes: payload.bufferMinutes,
      bookingEnabled: payload.bookingEnabled,
      bookingMode: payload.bookingMode,
      minNoticeMinutes: payload.minNoticeMinutes,
      maxAdvanceBookingDays: payload.maxAdvanceBookingDays,
      maxConcurrentBookings: payload.maxConcurrentBookings,
      status: payload.status,
      photos: JSON.stringify(payload.photos),
      skills: JSON.stringify(payload.skills),
      publishedAt: payload.status === "active" ? now : null,
      createdAt: now,
      updatedAt: now,
    }).returning(),
  ];

  if (availability.length > 0) {
    queries.push(db.insert(serviceAvailabilities).values(
      availability.map((window) => ({
        id: generateId("avail"),
        serviceId,
        dayOfWeek: window.dayOfWeek,
        startTime: window.startTime,
        endTime: window.endTime,
        timezone: window.timezone,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
    ));
  }

  let created;
  try {
    const results = await db.batch(queries);
    [created] = results[0];
  } catch (error) {
    console.error("[createService] error:", error);
    return res.status(500).json({ error: "Failed to create service. Please try again." });
  }

  return res.status(201).json({
    success: true,
    service: serializeService(created, {
      provider,
      availability,
      isOwner: true,
      includeDeleted: true,
    }),
  });
};

const getMyServices = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(serviceOfferings)
      .where(and(
        eq(serviceOfferings.providerId, req.auth.userId),
        isNull(serviceOfferings.deletedAt)
      ))
      .orderBy(desc(serviceOfferings.updatedAt), desc(serviceOfferings.createdAt));

    const availability = await loadAvailability(rows.map((row) => row.id));
    return res.status(200).json({
      count: rows.length,
      services: rows.map((row) => serializeService(row, {
        availability: availability.get(row.id) ?? [],
        isOwner: true,
        includeDeleted: true,
      })),
    });
  } catch (error) {
    console.error("[getMyServices] error:", error);
    return res.status(500).json({ error: "Failed to load services. Please try again." });
  }
};

const listServices = async (req, res) => {
  try {
    const status = String(req.query.status || "active").trim();
    if (status !== "active") {
      return res.status(400).json({ error: "Only active services can be listed publicly." });
    }
    const limit = parsePositiveInt(req.query.limit, 20, 1, MAX_SERVICE_RESULTS, "limit");
    const offset = parsePositiveInt(req.query.offset, 0, 0, 10000, "offset");
    const conditions = [
      eq(serviceOfferings.status, status),
      isNull(serviceOfferings.deletedAt),
    ];
    const category = req.query.category ? String(req.query.category).trim() : null;
    const serviceMode = req.query.serviceMode ? String(req.query.serviceMode).trim() : null;
    const location = req.query.location ? String(req.query.location).trim() : null;
    const q = req.query.q ? String(req.query.q).trim() : null;

    if (category) conditions.push(eq(serviceOfferings.category, category));
    if (serviceMode) {
      if (!["on_site", "remote", "both"].includes(serviceMode)) {
        return res.status(400).json({ error: "serviceMode is not valid." });
      }
      conditions.push(eq(serviceOfferings.serviceMode, serviceMode));
    }
    if (location) conditions.push(ilike(serviceOfferings.location, `%${location}%`));
    if (q) {
      const like = `%${q}%`;
      conditions.push(or(
        ilike(serviceOfferings.title, like),
        ilike(serviceOfferings.category, like),
        ilike(serviceOfferings.location, like),
        ilike(serviceOfferings.description, like)
      ));
    }

    const rows = await db
      .select()
      .from(serviceOfferings)
      .where(and(...conditions))
      .orderBy(desc(serviceOfferings.publishedAt), desc(serviceOfferings.createdAt))
      .limit(limit)
      .offset(offset);

    const providerIds = rows.map((row) => row.providerId);
    const providerMap = await loadUsers(providerIds);
    const availabilityMap = await loadAvailability(rows.map((row) => row.id), true);

    return res.status(200).json({
      count: rows.length,
      services: rows.map((row) => serializeService(row, {
        provider: providerMap.get(row.providerId),
        availability: availabilityMap.get(row.id) ?? [],
        isOwner: row.providerId === req.auth.userId,
      })),
    });
  } catch (error) {
    console.error("[listServices] error:", error);
    return res.status(500).json({ error: "Failed to load services. Please try again." });
  }
};

const getServiceById = async (req, res) => {
  try {
    const row = await getVisibleService(String(req.params.id).trim(), req.auth.userId);
    if (!row) return res.status(404).json({ error: "Service not found." });

    const [provider] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        location: users.location,
      })
      .from(users)
      .where(eq(users.id, row.providerId))
      .limit(1);
    const availability = await loadServiceAvailability(row.id, row.providerId !== req.auth.userId);

    return res.status(200).json({
      service: serializeService(row, {
        provider,
        availability,
        isOwner: row.providerId === req.auth.userId,
        includeDeleted: row.providerId === req.auth.userId,
      }),
    });
  } catch (error) {
    console.error("[getServiceById] error:", error);
    return res.status(500).json({ error: "Failed to load service. Please try again." });
  }
};

const updateService = async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(serviceOfferings)
      .where(eq(serviceOfferings.id, String(req.params.id).trim()))
      .limit(1);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: "Service not found." });
    if (existing.providerId !== req.auth.userId) {
      return res.status(403).json({ error: "You can only edit your own services." });
    }

    let patch;
    try {
      patch = validateServicePayload(req.body, true);
    } catch (error) {
      return validationError(res, error);
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No editable fields provided." });
    }

    const current = serviceToPayload(existing);
    const merged = { ...current, ...patch };
    let payload;
    try {
      payload = validateServicePayload(merged, false);
    } catch (error) {
      return validationError(res, error);
    }

    let nextAvailability = null;
    if (Object.prototype.hasOwnProperty.call(req.body, "availability")) {
      try {
        nextAvailability = validateAvailabilityPayload(req.body.availability);
      } catch (error) {
        return validationError(res, error);
      }
      if (payload.status === "active" && payload.bookingEnabled && nextAvailability.length === 0) {
        return res.status(400).json({ error: "Add at least one availability window before publishing." });
      }
    }

    const schedulingFields = [
      "bookingEnabled",
      "bookingMode",
      "durationMinutes",
      "bufferMinutes",
      "minNoticeMinutes",
      "maxAdvanceBookingDays",
      "maxConcurrentBookings",
      "serviceMode",
      "priceAmount",
      "priceType",
      "currency",
    ];
    const hasUpcomingAppointments = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(
        eq(appointments.serviceId, existing.id),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
        gt(appointments.startsAt, new Date())
      ))
      .limit(1);
    if (hasUpcomingAppointments && schedulingFields.some((field) => Object.prototype.hasOwnProperty.call(patch, field))) {
      return res.status(409).json({
        error: "Booking settings cannot change while upcoming appointments exist.",
      });
    }

    const provider = await requireOnboardedUser(req.auth.userId);
    if (!provider) return res.status(404).json({ error: "Provider account not found." });
    if (provider.error && payload.status === "active") {
      return res.status(403).json({ error: provider.error });
    }

    if (payload.status === "active" && payload.bookingEnabled) {
      const availability = await loadServiceAvailability(existing.id, false);
      const hasAvailability = availability.length > 0 || (nextAvailability && nextAvailability.length > 0);
      if (!hasAvailability) {
        return res.status(400).json({ error: "Add at least one availability window before publishing." });
      }
    }

    const now = new Date();
    const publishedAt = payload.status === "active"
      ? (existing.publishedAt ?? now)
      : existing.publishedAt;
    const queries = [
      db.update(serviceOfferings)
        .set({
          title: payload.title,
          category: payload.category,
          description: payload.description,
          location: payload.location,
          serviceMode: payload.serviceMode,
          priceAmount: payload.priceAmount,
          currency: payload.currency,
          priceType: payload.priceType,
          durationMinutes: payload.durationMinutes,
          bufferMinutes: payload.bufferMinutes,
          bookingEnabled: payload.bookingEnabled,
          bookingMode: payload.bookingMode,
          minNoticeMinutes: payload.minNoticeMinutes,
          maxAdvanceBookingDays: payload.maxAdvanceBookingDays,
          maxConcurrentBookings: payload.maxConcurrentBookings,
          status: payload.status,
          photos: JSON.stringify(payload.photos),
          skills: JSON.stringify(payload.skills),
          publishedAt,
          updatedAt: now,
        })
        .where(eq(serviceOfferings.id, existing.id))
        .returning(),
    ];
    let availabilityWasProvided = false;
    if (Object.prototype.hasOwnProperty.call(req.body, "availability")) {
      const availabilityWrite = buildAvailabilityQueries(existing.id, req.body.availability);
      queries.push(...availabilityWrite.queries);
      availabilityWasProvided = true;
    }

    let updated;
    try {
      const results = await db.batch(queries);
      [updated] = results[0];
    } catch (error) {
      console.error("[updateService] error:", error);
      return res.status(500).json({ error: "Failed to update service. Please try again." });
    }

    const availability = availabilityWasProvided
      ? await loadServiceAvailability(existing.id, false)
      : nextAvailability
        ? nextAvailability.map((window) => ({ ...window, isActive: true }))
        : await loadServiceAvailability(existing.id, false);

    return res.status(200).json({
      service: serializeService(updated, {
        provider,
        availability,
        isOwner: true,
        includeDeleted: true,
      }),
    });
  } catch (error) {
    console.error("[updateService] error:", error);
    return res.status(500).json({ error: "Failed to update service. Please try again." });
  }
};

const getServiceAvailability = async (req, res) => {
  try {
    const row = await getVisibleService(String(req.params.id).trim(), req.auth.userId);
    if (!row) return res.status(404).json({ error: "Service not found." });
    const availability = await loadServiceAvailability(row.id, row.providerId !== req.auth.userId);
    return res.status(200).json({
      availability,
      count: availability.length,
    });
  } catch (error) {
    console.error("[getAvailability] error:", error);
    return res.status(500).json({ error: "Failed to load availability. Please try again." });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(serviceOfferings)
      .where(eq(serviceOfferings.id, String(req.params.id).trim()))
      .limit(1);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: "Service not found." });
    if (existing.providerId !== req.auth.userId) {
      return res.status(403).json({ error: "You can only edit your own services." });
    }

    let availability;
    try {
      availability = validateAvailabilityPayload(req.body.availability);
    } catch (error) {
      return validationError(res, error);
    }
    if (existing.status === "active" && existing.bookingEnabled && availability.length === 0) {
      return res.status(400).json({ error: "An active bookable service needs at least one availability window." });
    }

    try {
      availability = await replaceAvailability(existing.id, req.body.availability);
    } catch (error) {
      console.error("[updateAvailability] error:", error);
      return res.status(500).json({ error: "Failed to update availability. Please try again." });
    }

    return res.status(200).json({
      success: true,
      availability,
      count: availability.length,
    });
  } catch (error) {
    console.error("[updateAvailability] error:", error);
    return res.status(500).json({ error: "Failed to update availability. Please try again." });
  }
};

const deleteService = async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(serviceOfferings)
      .where(eq(serviceOfferings.id, String(req.params.id).trim()))
      .limit(1);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: "Service not found." });
    if (existing.providerId !== req.auth.userId) {
      return res.status(403).json({ error: "You can only delete your own services." });
    }

    const [upcoming] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(
        eq(appointments.serviceId, existing.id),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES)
      ))
      .limit(1);
    if (upcoming) {
      return res.status(409).json({
        error: "Cancel or complete upcoming appointments before deleting this service.",
      });
    }

    const now = new Date();
    await db
      .update(serviceOfferings)
      .set({
        status: "archived",
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(serviceOfferings.id, existing.id));

    return res.status(200).json({ success: true, id: existing.id });
  } catch (error) {
    console.error("[deleteService] error:", error);
    return res.status(500).json({ error: "Failed to delete service. Please try again." });
  }
};

const createAppointment = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorised" });

  const [client] = await db
    .select({ id: users.id, isOnboarded: users.isOnboarded })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!client) return res.status(404).json({ error: "Client account not found." });
  if (!client.isOnboarded) return res.status(403).json({ error: "Complete onboarding before booking an appointment." });

  const serviceId = String(req.body?.serviceId || "").trim();
  if (!serviceId) return res.status(400).json({ error: "serviceId is required." });

  try {
    const [service] = await db
      .select()
      .from(serviceOfferings)
      .where(eq(serviceOfferings.id, serviceId))
      .limit(1);
    const serviceError = await assertActiveService(service);
    if (serviceError) return res.status(404).json({ error: serviceError });

    const [provider] = await db
      .select({ id: users.id, availableForWork: users.availableForWork })
      .from(users)
      .where(eq(users.id, service.providerId))
      .limit(1);
    if (!provider || !provider.availableForWork) {
      return res.status(409).json({ error: "This service provider is not currently available." });
    }
    if (service.providerId === userId) {
      return res.status(400).json({ error: "You cannot book your own service." });
    }

    let times;
    try {
      times = validateAppointmentTimes(req.body, service);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const availability = await db
      .select()
      .from(serviceAvailabilities)
      .where(and(
        eq(serviceAvailabilities.serviceId, service.id),
        eq(serviceAvailabilities.isActive, true)
      ));
    if (!isWithinAvailability(
      times.startsAt,
      times.endsAt,
      service.bufferMinutes,
      times.timezone,
      availability
    )) {
      return res.status(409).json({ error: "The requested time is outside the service availability." });
    }

    const rows = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.serviceId, service.id),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES)
      ));
    if (hasOverlap(
      times.startsAt,
      times.endsAt,
      service.bufferMinutes,
      rows
    ) && rows.filter((row) => hasOverlap(
      times.startsAt,
      times.endsAt,
      service.bufferMinutes,
      [row]
    )).length >= service.maxConcurrentBookings) {
      return res.status(409).json({ error: "The requested time is already booked." });
    }

    const idempotencyKey = normaliseIdempotencyKey(req.body?.idempotencyKey);
    if (idempotencyKey) {
      const [existing] = await db
        .select()
        .from(appointments)
        .where(and(
          eq(appointments.clientId, userId),
          eq(appointments.idempotencyKey, idempotencyKey)
        ))
        .limit(1);
      if (existing) {
        if (
          existing.serviceId !== service.id ||
          existing.startsAt.getTime() !== times.startsAt.getTime()
        ) {
          return res.status(409).json({ error: "idempotencyKey has already been used for a different appointment." });
        }
        const appointment = await enrichAppointment(existing);
        return res.status(200).json({ success: true, appointment });
      }
    }

    let meeting;
    try {
      meeting = validateMeetingDetails(req.body, service);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const now = new Date();
    const appointmentId = generateId("appointment");
    const status = service.bookingMode === "instant" ? "confirmed" : "pending";
    const [created] = await db
      .insert(appointments)
      .values({
        id: appointmentId,
        serviceId: service.id,
        providerId: service.providerId,
        clientId: userId,
        startsAt: times.startsAt,
        endsAt: times.endsAt,
        timezone: times.timezone,
        status,
        meetingType: meeting.meetingType,
        location: meeting.location,
        meetingDetails: meeting.meetingDetails,
        notes: optionalText(req.body.notes, "notes", 2000),
        priceAmount: service.priceAmount,
        currency: service.currency,
        paymentStatus: "unpaid",
        idempotencyKey,
        version: 1,
        createdAt: now,
        updatedAt: now,
        confirmedAt: status === "confirmed" ? now : null,
      })
      .returning();

    const appointment = await enrichAppointment(created);
    return res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error("[createAppointment] error:", error);
    return res.status(500).json({ error: "Failed to create appointment. Please try again." });
  }
};

const listAppointments = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const status = req.query.status ? String(req.query.status).trim() : null;
    if (status && !APPOINTMENT_STATUSES.has(status)) {
      return res.status(400).json({ error: "status is not valid." });
    }
    const role = req.query.role ? String(req.query.role).trim() : "both";
    if (!["both", "provider", "client"].includes(role)) {
      return res.status(400).json({ error: "role must be both, provider or client." });
    }
    const conditions = [or(
      eq(appointments.providerId, userId),
      eq(appointments.clientId, userId)
    )];
    if (role === "provider") conditions.push(eq(appointments.providerId, userId));
    if (role === "client") conditions.push(eq(appointments.clientId, userId));
    if (status) conditions.push(eq(appointments.status, status));

    let from = null;
    let to = null;
    try {
      from = req.query.from ? parseIsoDate(req.query.from, "from") : null;
      to = req.query.to ? parseIsoDate(req.query.to, "to") : null;
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    if (from) conditions.push(gt(appointments.startsAt, from));
    if (to) conditions.push(gt(to, appointments.startsAt));

    const limit = parsePositiveInt(req.query.limit, 50, 1, 100, "limit");
    const rows = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.startsAt))
      .limit(limit);

    const serviceMap = await loadServices(rows.map((row) => row.serviceId));
    const userMap = await loadUsers(rows.flatMap((row) => [row.providerId, row.clientId]));
    return res.status(200).json({
      count: rows.length,
      appointments: rows.map((row) => serializeAppointment(row, {
        service: serviceMap.get(row.serviceId),
        provider: userMap.get(row.providerId),
        client: userMap.get(row.clientId),
      })),
    });
  } catch (error) {
    console.error("[listAppointments] error:", error);
    return res.status(500).json({ error: "Failed to load appointments. Please try again." });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, String(req.params.id).trim()))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Appointment not found." });
    if (row.providerId !== req.auth.userId && row.clientId !== req.auth.userId) {
      return res.status(403).json({ error: "You are not a participant in this appointment." });
    }
    const [service, provider, client] = await Promise.all([
      db.select().from(serviceOfferings).where(eq(serviceOfferings.id, row.serviceId)).limit(1).then((rows) => rows[0]),
      db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        location: users.location,
      }).from(users).where(eq(users.id, row.providerId)).limit(1).then((rows) => rows[0]),
      db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        location: users.location,
      }).from(users).where(eq(users.id, row.clientId)).limit(1).then((rows) => rows[0]),
    ]);
    return res.status(200).json({
      appointment: serializeAppointment(row, { service, provider, client }),
    });
  } catch (error) {
    console.error("[getAppointmentById] error:", error);
    return res.status(500).json({ error: "Failed to load appointment. Please try again." });
  }
};

async function loadAppointmentForAction(id, userId, allowedRole) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, String(id).trim()))
    .limit(1);
  if (!row) return { error: "Appointment not found.", status: 404 };
  const isProvider = row.providerId === userId;
  const isClient = row.clientId === userId;
  if (!isProvider && !isClient) return { error: "You are not a participant in this appointment.", status: 403 };
  if (allowedRole === "provider" && !isProvider) {
    return { error: "Only the service provider can perform this action.", status: 403 };
  }
  if (allowedRole === "client" && !isClient) {
    return { error: "Only the client can perform this action.", status: 403 };
  }
  return { row, isProvider, isClient };
}

async function enrichAppointment(row) {
  const [service, provider, client] = await Promise.all([
    db.select().from(serviceOfferings).where(eq(serviceOfferings.id, row.serviceId)).limit(1).then((items) => items[0]),
    db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      location: users.location,
    }).from(users).where(eq(users.id, row.providerId)).limit(1).then((items) => items[0]),
    db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      imageUrl: users.imageUrl,
      location: users.location,
    }).from(users).where(eq(users.id, row.clientId)).limit(1).then((items) => items[0]),
  ]);
  return serializeAppointment(row, { service, provider, client });
}

async function updateAppointment(row, values, statuses, now = new Date()) {
  const [updated] = await db
    .update(appointments)
    .set({
      ...values,
      updatedAt: now,
      version: row.version + 1,
    })
    .where(and(
      eq(appointments.id, row.id),
      inArray(appointments.status, statuses),
      eq(appointments.version, row.version)
    ))
    .returning();
  return updated ?? null;
}

function appointmentStateChanged(res) {
  return res.status(409).json({ error: "Appointment state changed. Reload the appointment and try again." });
}

const acceptAppointment = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "provider");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Only pending appointments can be accepted." });
    }
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "confirmed",
      confirmedAt: now,
    }, ["pending"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[acceptAppointment] error:", error);
    return res.status(500).json({ error: "Failed to accept appointment. Please try again." });
  }
};

const declineAppointment = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "provider");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "pending") {
      return res.status(409).json({ error: "Only pending appointments can be declined." });
    }
    const cancellationReason = validateCancellationReason(req.body?.cancellationReason, false) || "Provider declined this request.";
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "declined",
      cancellationReason,
      cancelledAt: now,
    }, ["pending"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[declineAppointment] error:", error);
    return res.status(500).json({ error: "Failed to decline appointment. Please try again." });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "both");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (!["pending", "confirmed", "reschedule_requested"].includes(row.status)) {
      return res.status(409).json({ error: "This appointment can no longer be cancelled." });
    }
    if (row.status === "confirmed" && row.startsAt <= new Date()) {
      return res.status(409).json({ error: "A confirmed appointment cannot be cancelled after it starts." });
    }
    const cancellationReason = validateCancellationReason(
      req.body?.cancellationReason,
      row.status === "confirmed"
    );
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "cancelled",
      cancellationReason: cancellationReason || "Appointment cancelled.",
      cancelledAt: now,
      proposedStartsAt: null,
      proposedEndsAt: null,
      rescheduleRequestedBy: null,
      rescheduleReason: null,
    }, ["pending", "confirmed", "reschedule_requested"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[cancelAppointment] error:", error);
    return res.status(500).json({ error: "Failed to cancel appointment. Please try again." });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "both");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row, isProvider, isClient } = loaded;
    if (!["pending", "confirmed"].includes(row.status)) {
      return res.status(409).json({ error: "This appointment cannot be rescheduled in its current status." });
    }

    const [service] = await db
      .select()
      .from(serviceOfferings)
      .where(eq(serviceOfferings.id, row.serviceId))
      .limit(1);
    const serviceError = await assertActiveService(service);
    if (serviceError) return res.status(404).json({ error: serviceError });

    let times;
    try {
      times = validateReschedulePayload(req.body, service);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const availability = await loadServiceAvailability(service.id, true);
    if (!isWithinAvailability(times.startsAt, times.endsAt, service.bufferMinutes, times.timezone, availability)) {
      return res.status(409).json({ error: "The requested time is outside the service availability." });
    }
    const rows = await appointmentRowsForService(service.id, row.id);
    if (hasOverlap(times.startsAt, times.endsAt, service.bufferMinutes, rows) &&
        rows.filter((item) => hasOverlap(times.startsAt, times.endsAt, service.bufferMinutes, [item])).length >= service.maxConcurrentBookings) {
      return res.status(409).json({ error: "The requested time is already booked." });
    }

    const now = new Date();
    if (row.status === "pending") {
      const updated = await updateAppointment(row, {
        startsAt: times.startsAt,
        endsAt: times.endsAt,
        timezone: times.timezone,
        rescheduleReason: optionalText(req.body.reason, "reason", 1000),
      }, ["pending"], now);
      if (!updated) return appointmentStateChanged(res);
      return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
    }

    const updated = await updateAppointment(row, {
      status: "reschedule_requested",
      proposedStartsAt: times.startsAt,
      proposedEndsAt: times.endsAt,
      rescheduleRequestedBy: isProvider ? row.providerId : row.clientId,
      rescheduleReason: validateCancellationReason(req.body.reason, false),
    }, ["confirmed"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[rescheduleAppointment] error:", error);
    return res.status(500).json({ error: "Failed to reschedule appointment. Please try again." });
  }
};

const acceptReschedule = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "both");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "reschedule_requested" || !row.proposedStartsAt || !row.proposedEndsAt) {
      return res.status(409).json({ error: "There is no pending reschedule request." });
    }
    if (row.rescheduleRequestedBy === req.auth.userId) {
      return res.status(400).json({ error: "The other participant must accept the reschedule request." });
    }
    const [service] = await db.select().from(serviceOfferings).where(eq(serviceOfferings.id, row.serviceId)).limit(1);
    const serviceError = await assertActiveService(service);
    if (serviceError) return res.status(404).json({ error: serviceError });
    let proposed;
    try {
      proposed = validateAppointmentTimes({
        startsAt: row.proposedStartsAt instanceof Date
          ? row.proposedStartsAt.toISOString()
          : row.proposedStartsAt,
        endsAt: row.proposedEndsAt instanceof Date
          ? row.proposedEndsAt.toISOString()
          : row.proposedEndsAt,
        timezone: row.timezone,
      }, service);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const availability = await loadServiceAvailability(service.id, true);
    if (!isWithinAvailability(proposed.startsAt, proposed.endsAt, service.bufferMinutes, proposed.timezone, availability)) {
      return res.status(409).json({ error: "The proposed time is no longer available." });
    }
    const rows = await appointmentRowsForService(service.id, row.id);
    if (hasOverlap(proposed.startsAt, proposed.endsAt, service.bufferMinutes, rows) &&
        rows.filter((item) => hasOverlap(proposed.startsAt, proposed.endsAt, service.bufferMinutes, [item])).length >= service.maxConcurrentBookings) {
      return res.status(409).json({ error: "The proposed time is already booked." });
    }
    const now = new Date();
    const updated = await updateAppointment(row, {
      startsAt: proposed.startsAt,
      endsAt: proposed.endsAt,
      timezone: proposed.timezone,
      status: "confirmed",
      proposedStartsAt: null,
      proposedEndsAt: null,
      rescheduleRequestedBy: null,
      rescheduleReason: null,
    }, ["reschedule_requested"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[acceptReschedule] error:", error);
    return res.status(500).json({ error: "Failed to accept reschedule. Please try again." });
  }
};

const rejectReschedule = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "both");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "reschedule_requested") {
      return res.status(409).json({ error: "There is no pending reschedule request." });
    }
    if (row.rescheduleRequestedBy === req.auth.userId) {
      return res.status(400).json({ error: "The other participant must respond to the reschedule request." });
    }
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "confirmed",
      proposedStartsAt: null,
      proposedEndsAt: null,
      rescheduleRequestedBy: null,
      rescheduleReason: null,
    }, ["reschedule_requested"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[rejectReschedule] error:", error);
    return res.status(500).json({ error: "Failed to reject reschedule. Please try again." });
  }
};

const completeAppointment = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "provider");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "confirmed") {
      return res.status(409).json({ error: "Only confirmed appointments can be completed." });
    }
    if (row.endsAt > new Date()) {
      return res.status(409).json({ error: "Appointment can be completed after its scheduled end time." });
    }
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "completed",
      completedAt: now,
    }, ["confirmed"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[completeAppointment] error:", error);
    return res.status(500).json({ error: "Failed to complete appointment. Please try again." });
  }
};

const markNoShow = async (req, res) => {
  try {
    const loaded = await loadAppointmentForAction(req.params.id, req.auth.userId, "provider");
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { row } = loaded;
    if (row.status !== "confirmed") {
      return res.status(409).json({ error: "Only confirmed appointments can be marked as no-show." });
    }
    if (row.startsAt > new Date()) {
      return res.status(409).json({ error: "Appointment can be marked as no-show after its scheduled start time." });
    }
    const now = new Date();
    const updated = await updateAppointment(row, {
      status: "no_show",
      noShowAt: now,
    }, ["confirmed"], now);
    if (!updated) return appointmentStateChanged(res);
    return res.status(200).json({ success: true, appointment: await enrichAppointment(updated) });
  } catch (error) {
    console.error("[markNoShow] error:", error);
    return res.status(500).json({ error: "Failed to mark appointment as no-show. Please try again." });
  }
};

export {
  uploadPhotos,
  createService,
  getMyServices,
  listServices,
  getServiceById,
  updateService,
  getServiceAvailability,
  updateAvailability,
  deleteService,
  createAppointment,
  listAppointments,
  getAppointmentById,
  acceptAppointment,
  declineAppointment,
  cancelAppointment,
  rescheduleAppointment,
  acceptReschedule,
  rejectReschedule,
  completeAppointment,
  markNoShow,
};
