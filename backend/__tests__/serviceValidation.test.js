import test from "node:test";
import assert from "node:assert/strict";
import {
  hasOverlap,
  isWithinAvailability,
  validateAppointmentTimes,
  validateAvailabilityPayload,
  validateServicePayload,
} from "../src/utils/serviceValidation.js";

test("validates a complete fixed-price service", () => {
  const service = validateServicePayload({
    title: "Home plumbing repair",
    category: "plumbing",
    description: "Repair leaking taps and pipe fittings.",
    location: "Juja, Kiambu",
    serviceMode: "on_site",
    priceType: "fixed",
    priceAmount: 3500,
    durationMinutes: 60,
  });

  assert.equal(service.status, "draft");
  assert.equal(service.bookingEnabled, true);
  assert.equal(service.bookingMode, "request");
  assert.equal(service.currency, "KES");
  assert.deepEqual(service.photos, []);
});

test("requires a duration for a bookable service", () => {
  assert.throws(
    () => validateServicePayload({
      title: "Home plumbing repair",
      category: "plumbing",
      description: "Repair leaking taps and pipe fittings.",
      location: "Juja, Kiambu",
      serviceMode: "on_site",
      priceType: "fixed",
      priceAmount: 3500,
    }),
    /durationMinutes/
  );
});

test("validates recurring availability windows", () => {
  const availability = validateAvailabilityPayload([
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      timezone: "Africa/Nairobi",
    },
  ]);
  assert.equal(availability[0].startTime, "09:00");

  assert.throws(
    () => validateAvailabilityPayload([
      { dayOfWeek: 1, startTime: "17:00", endTime: "09:00" },
    ]),
    /endTime must be after startTime/
  );
});

test("allows an empty availability list for draft services", () => {
  assert.deepEqual(validateAvailabilityPayload([]), []);
});

test("derives appointment end time from service duration", () => {
  const appointment = validateAppointmentTimes(
    {
      startsAt: "2026-09-28T09:00:00+03:00",
      timezone: "Africa/Nairobi",
    },
    {
      durationMinutes: 90,
      minNoticeMinutes: 60,
      maxAdvanceBookingDays: 90,
    }
  );

  assert.equal(appointment.endsAt.toISOString(), "2026-09-28T07:30:00.000Z");
});

test("detects overlapping appointment buffers", () => {
  const start = new Date("2026-09-28T06:00:00.000Z");
  const end = new Date("2026-09-28T07:00:00.000Z");
  assert.equal(
    hasOverlap(start, end, 15, [
      { startsAt: new Date("2026-09-28T07:10:00.000Z"), endsAt: new Date("2026-09-28T08:00:00.000Z") },
    ]),
    true
  );
});

test("matches availability in the requested time zone", () => {
  const start = new Date("2026-09-28T06:00:00.000Z");
  const end = new Date("2026-09-28T07:00:00.000Z");
  assert.equal(
    isWithinAvailability(start, end, 0, "Africa/Nairobi", [
      {
        isActive: true,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Africa/Nairobi",
      },
    ]),
    true
  );
  assert.equal(
    isWithinAvailability(start, end, 0, "Africa/Nairobi", [
      {
        isActive: true,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Europe/London",
      },
    ]),
    false
  );
});
