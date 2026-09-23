import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MESSAGE_LENGTH,
  parseMessagesPagination,
  validateMessageBody,
} from "../src/utils/chatValidation.js";

test("validateMessageBody trims whitespace", () => {
  assert.equal(validateMessageBody("   hello   "), "hello");
});

test("validateMessageBody rejects empty messages", () => {
  assert.throws(() => validateMessageBody(""), /cannot be empty/i);
  assert.throws(() => validateMessageBody("   "), /cannot be empty/i);
  assert.throws(() => validateMessageBody(null), /cannot be empty/i);
  assert.throws(() => validateMessageBody(42), /cannot be empty/i);
  assert.throws(() => validateMessageBody(undefined), /cannot be empty/i);
});

test("validateMessageBody rejects over-long messages", () => {
  assert.throws(() => validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1)), /too long/i);
  assert.equal(validateMessageBody("a".repeat(MAX_MESSAGE_LENGTH)).length, MAX_MESSAGE_LENGTH);
});

test("parseMessagesPagination defaults", () => {
  assert.deepEqual(parseMessagesPagination({}), { limit: 50, before: null });
  assert.deepEqual(parseMessagesPagination({ limit: "20" }), { limit: 20, before: null });
});

test("parseMessagesPagination validates limit bounds", () => {
  assert.throws(() => parseMessagesPagination({ limit: "0" }), /limit must be/i);
  assert.throws(() => parseMessagesPagination({ limit: "2000" }), /limit must be/i);
  assert.throws(() => parseMessagesPagination({ limit: "abc" }), /limit must be/i);
});

test("parseMessagesPagination parses before into ISO", () => {
  const { before } = parseMessagesPagination({ before: "2026-01-01T00:00:00.000Z" });
  assert.equal(before, "2026-01-01T00:00:00.000Z");
  assert.throws(() => parseMessagesPagination({ before: "not-a-date" }), /ISO date/i);
});