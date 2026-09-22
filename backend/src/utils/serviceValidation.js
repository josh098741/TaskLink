const SERVICE_MODES = new Set(["on_site", "remote", "both"]);
const PRICE_TYPES = new Set(["fixed", "hourly", "negotiable"]);
const SERVICE_STATUSES = new Set(["draft", "active", "paused", "archived"]);
const BOOKING_MODES = new Set(["request", "instant"]);
const MEETING_TYPES = new Set(["on_site", "remote", "phone", "video"]);
const APPOINTMENT_STATUSES = new Set([
  "pending",
  "confirmed",
  "reschedule_requested",
  "cancelled",
  "declined",
  "completed",
  "no_show",
]);
const PAYMENT_STATUSES = new Set(["unpaid", "paid", "refunded", "waived"]);

function cleanText(value, field, min, max) {
  if (typeof value !== "string" || value.trim().length < min) {
    throw new Error(`${field} is required.`);
  }
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length > max) {
    throw new Error(`${field} must be ${max} characters or fewer.`);
  }
  return cleaned;
}

function optionalText(value, field, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  const cleaned = value.trim();
  if (cleaned.length > max) {
    throw new Error(`${field} must be ${max} characters or fewer.`);
  }
  return cleaned || null;
}

function booleanField(value, field) {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

function integerField(value, field, min, max) {
  if (!Number.isInteger(value)) throw new Error(`${field} must be an integer.`);
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

function enumField(value, field, allowed, label) {
  if (!allowed.has(value)) throw new Error(label);
  return value;
}

function normaliseTime(value, field = "time") {
  if (typeof value !== "string") throw new Error(`${field} must be a time in HH:mm format.`);
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error(`${field} must be a time in HH:mm format.`);
  return `${match[1]}:${match[2]}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function normaliseCurrency(value) {
  const currency = value === undefined || value === null || value === "" ? "KES" : value;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
    throw new Error("currency must be a three-letter ISO currency code.");
  }
  return currency.trim().toUpperCase();
}

function normalisePriceAmount(value, field = "priceAmount") {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
  return value;
}

function normalisePhotoUrls(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("photos must be an array.");
  if (value.length > 5) throw new Error("A maximum of 5 photos is allowed.");
  return value.map((photo, index) => {
    if (typeof photo !== "string" || !/^https?:\/\/\S+$/i.test(photo.trim())) {
      throw new Error(`photos[${index}] must be a valid HTTP or HTTPS URL.`);
    }
    return photo.trim();
  });
}

function normaliseStringArray(value, field, maxItems, maxItemLength) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  if (value.length > maxItems) throw new Error(`A maximum of ${maxItems} ${field} is allowed.`);
  return value.map((item, index) => {
    const cleaned = cleanText(item, `${field}[${index}]`, 1, maxItemLength);
    return cleaned;
  });
}

function normaliseTimezone(value) {
  const timezone = value === undefined || value === null || value === "" ? "Africa/Nairobi" : value;
  if (typeof timezone !== "string") throw new Error("timezone must be a string.");
  const cleaned = timezone.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned }).format();
  } catch {
    throw new Error("timezone must be a valid IANA time zone.");
  }
  return cleaned;
}

function parseIsoDate(value, field) {
  if (typeof value !== "string" || !/[zZ]|[+-]\d{2}:\d{2}$/.test(value.trim())) {
    throw new Error(`${field} must be an ISO 8601 date-time with a time zone.`);
  }
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid date-time.`);
  return parsed;
}

function normaliseIdempotencyKey(value) {
  if (value === undefined || value === null || value === "") return null;
  return cleanText(value, "idempotencyKey", 8, 100);
}

function validateServicePayload(body, partial = false) {
  const source = body && typeof body === "object" ? body : {};
  const result = {};

  if (!partial || Object.prototype.hasOwnProperty.call(source, "title")) {
    result.title = cleanText(source.title, "title", 3, 120);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "category")) {
    result.category = cleanText(source.category, "category", 2, 100);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "description")) {
    result.description = cleanText(source.description, "description", 10, 5000);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "location")) {
    result.location = cleanText(source.location, "location", 2, 200);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "serviceMode")) {
    result.serviceMode = enumField(
      source.serviceMode,
      "serviceMode",
      SERVICE_MODES,
      "serviceMode must be on_site, remote or both."
    );
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "priceType")) {
    result.priceType = enumField(
      source.priceType ?? (partial ? undefined : "fixed"),
      "priceType",
      PRICE_TYPES,
      "priceType must be fixed, hourly or negotiable."
    );
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "currency")) {
    result.currency = normaliseCurrency(source.currency);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "priceAmount")) {
    result.priceAmount = normalisePriceAmount(source.priceAmount);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "durationMinutes")) {
    result.durationMinutes = source.durationMinutes === undefined || source.durationMinutes === null
      ? null
      : integerField(source.durationMinutes, "durationMinutes", 15, 1440);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "bufferMinutes")) {
    result.bufferMinutes = source.bufferMinutes === undefined || source.bufferMinutes === null
      ? 0
      : integerField(source.bufferMinutes, "bufferMinutes", 0, 240);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "bookingEnabled")) {
    result.bookingEnabled = source.bookingEnabled === undefined
      ? true
      : booleanField(source.bookingEnabled, "bookingEnabled");
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "bookingMode")) {
    result.bookingMode = enumField(
      source.bookingMode ?? (partial ? undefined : "request"),
      "bookingMode",
      BOOKING_MODES,
      "bookingMode must be request or instant."
    );
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "minNoticeMinutes")) {
    result.minNoticeMinutes = source.minNoticeMinutes === undefined
      ? 60
      : integerField(source.minNoticeMinutes, "minNoticeMinutes", 0, 10080);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "maxAdvanceBookingDays")) {
    result.maxAdvanceBookingDays = source.maxAdvanceBookingDays === undefined
      ? 90
      : integerField(source.maxAdvanceBookingDays, "maxAdvanceBookingDays", 1, 365);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "maxConcurrentBookings")) {
    result.maxConcurrentBookings = source.maxConcurrentBookings === undefined
      ? 1
      : integerField(source.maxConcurrentBookings, "maxConcurrentBookings", 1, 20);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "status")) {
    result.status = enumField(
      source.status ?? (partial ? undefined : "draft"),
      "status",
      SERVICE_STATUSES,
      "status must be draft, active, paused or archived."
    );
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "photos")) {
    result.photos = normalisePhotoUrls(source.photos);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(source, "skills")) {
    result.skills = normaliseStringArray(source.skills, "skills", 20, 80);
  }

  if (!partial) {
    if (result.bookingEnabled && result.durationMinutes === null) {
      throw new Error("durationMinutes is required when booking is enabled.");
    }
    if (result.priceType !== "negotiable" && result.priceAmount === null) {
      throw new Error("priceAmount is required for fixed and hourly services.");
    }
    if (result.priceType === "negotiable" && result.priceAmount !== null) {
      throw new Error("priceAmount must be omitted for negotiable services.");
    }
  }

  return result;
}

function validateAvailabilityPayload(value) {
  if (!Array.isArray(value)) throw new Error("availability must be an array.");
  if (value.length > 28) throw new Error("A maximum of 28 availability windows is allowed.");

  return value.map((window, index) => {
    if (!window || typeof window !== "object" || Array.isArray(window)) {
      throw new Error(`availability[${index}] must be an object.`);
    }
    const dayOfWeek = integerField(window.dayOfWeek, `availability[${index}].dayOfWeek`, 0, 6);
    const startTime = normaliseTime(window.startTime, `availability[${index}].startTime`);
    const endTime = normaliseTime(window.endTime, `availability[${index}].endTime`);
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new Error(`availability[${index}].endTime must be after startTime.`);
    }
    return {
      dayOfWeek,
      startTime,
      endTime,
      timezone: normaliseTimezone(window.timezone),
    };
  });
}

function validateAppointmentTimes(payload, service) {
  const source = payload && typeof payload === "object" ? payload : {};
  const startsAt = parseIsoDate(source.startsAt, "startsAt");
  const timezone = normaliseTimezone(source.timezone || service.timezone || "Africa/Nairobi");
  const durationMinutes = service.durationMinutes;
  let endsAt;
  if (source.endsAt === undefined || source.endsAt === null || source.endsAt === "") {
    if (!durationMinutes) throw new Error("endsAt is required for this service.");
    endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  } else {
    endsAt = parseIsoDate(payload.endsAt, "endsAt");
  }

  if (durationMinutes && endsAt.getTime() - startsAt.getTime() !== durationMinutes * 60 * 1000) {
    throw new Error(`endsAt must be exactly ${durationMinutes} minutes after startsAt.`);
  }
  if (endsAt <= startsAt) throw new Error("endsAt must be after startsAt.");

  const now = new Date();
  const earliest = new Date(now.getTime() + service.minNoticeMinutes * 60 * 1000);
  const latest = new Date(
    now.getTime() + service.maxAdvanceBookingDays * 24 * 60 * 60 * 1000
  );
  if (startsAt < earliest) throw new Error("startsAt does not satisfy the minimum notice period.");
  if (startsAt > latest) throw new Error("startsAt is too far in the future.");

  return { startsAt, endsAt, timezone };
}

function validateReschedulePayload(payload, service) {
  return validateAppointmentTimes(payload, service);
}

function validateMeetingDetails(payload, service) {
  const source = payload && typeof payload === "object" ? payload : {};
  const meetingType = source.meetingType || (service.serviceMode === "remote" ? "remote" : "on_site");
  enumField(meetingType, "meetingType", MEETING_TYPES, "meetingType is not supported.");
  const location = source.location || (meetingType === "on_site" ? service.location : "Remote");
  const cleanLocation = cleanText(location, "location", 2, 200);
  const meetingDetails = optionalText(source.meetingDetails, "meetingDetails", 1000);
  if (meetingType !== "on_site" && !meetingDetails && meetingType !== "phone") {
    throw new Error("meetingDetails are required for remote or video appointments.");
  }
  return { meetingType, location: cleanLocation, meetingDetails };
}

function validateCancellationReason(value, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error("cancellationReason is required.");
    return null;
  }
  return cleanText(value, "cancellationReason", 3, 1000);
}

function validateStatus(value) {
  enumField(value, "status", APPOINTMENT_STATUSES, "status is not supported.");
  return value;
}

function validatePaymentStatus(value) {
  enumField(value, "paymentStatus", PAYMENT_STATUSES, "paymentStatus is not supported.");
  return value;
}

function getTimeParts(date, timezone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(parts.hour) % 24;
  return {
    dayOfWeek: weekdays[parts.weekday],
    minutes: hour * 60 + Number(parts.minute),
  };
}

function isWithinAvailability(startsAt, endsAt, bufferMinutes, timezone, windows) {
  const start = getTimeParts(
    new Date(startsAt.getTime() - bufferMinutes * 60 * 1000),
    timezone
  );
  const end = getTimeParts(
    new Date(endsAt.getTime() + bufferMinutes * 60 * 1000),
    timezone
  );
  return windows.some((window) => {
    if (
      !window.isActive ||
      window.timezone !== timezone ||
      window.dayOfWeek !== start.dayOfWeek ||
      start.dayOfWeek !== end.dayOfWeek
    ) {
      return false;
    }
    return start.minutes >= timeToMinutes(window.startTime) &&
      end.minutes <= timeToMinutes(window.endTime);
  });
}

function hasOverlap(startsAt, endsAt, bufferMinutes, rows, excludedId = null) {
  const bufferedStartsAt = new Date(startsAt.getTime() - bufferMinutes * 60 * 1000);
  const bufferedEndsAt = new Date(endsAt.getTime() + bufferMinutes * 60 * 1000);
  return rows.some((row) => {
    if (excludedId && row.id === excludedId) return false;
    const rowStart = row.startsAt instanceof Date ? row.startsAt : new Date(row.startsAt);
    const rowEnd = row.endsAt instanceof Date ? row.endsAt : new Date(row.endsAt);
    return bufferedStartsAt < rowEnd && bufferedEndsAt > rowStart;
  });
}

export {
  SERVICE_MODES,
  PRICE_TYPES,
  SERVICE_STATUSES,
  BOOKING_MODES,
  MEETING_TYPES,
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
  cleanText,
  optionalText,
  booleanField,
  integerField,
  normaliseTime,
  normaliseCurrency,
  normalisePriceAmount,
  normalisePhotoUrls,
  normaliseStringArray,
  normaliseTimezone,
  parseIsoDate,
  normaliseIdempotencyKey,
  validateServicePayload,
  validateAvailabilityPayload,
  validateAppointmentTimes,
  validateReschedulePayload,
  validateMeetingDetails,
  validateCancellationReason,
  validateStatus,
  validatePaymentStatus,
  getTimeParts,
  isWithinAvailability,
  hasOverlap,
};
