import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Phone validation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * normalisePhone
 * Strips every character that is NOT a digit or a leading '+', then
 * ensures the result conforms to E.164:
 *   • Starts with '+'
 *   • First digit after '+' is 1-9 (no leading zero country codes)
 *   • Total length (including '+') is 8–16 characters  → 7–15 digits
 *
 * Returns the cleaned string on success, or throws a descriptive Error.
 */
function normalisePhone(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Phone number is required.");
  }

  // 1. Strip all whitespace, hyphens, dots, parentheses, etc.
  //    Keep only digits and a single leading '+'.
  const stripped = raw.trim().replace(/[^\d+]/g, "");

  // 2. Remove any '+' that appears in the middle of the string
  //    (only a leading '+' is valid in E.164).
  const cleaned = stripped.startsWith("+")
    ? "+" + stripped.slice(1).replace(/\+/g, "")
    : stripped.replace(/\+/g, "");

  // 3. If there is no leading '+', reject – we require the full
  //    international format so we know which country code is intended.
  if (!cleaned.startsWith("+")) {
    throw new Error(
      "Phone number must include the country code (e.g. +254712345678)."
    );
  }

  // 4. Extract the digits-only portion (everything after '+').
  const digits = cleaned.slice(1);

  // 5. All remaining characters must be digits.
  if (!/^\d+$/.test(digits)) {
    throw new Error("Phone number may only contain digits after the '+' sign.");
  }

  // 6. First digit of the digit portion must not be 0
  //    (no valid country code starts with 0).
  if (digits[0] === "0") {
    throw new Error(
      "Invalid country code — the first digit after '+' cannot be 0."
    );
  }

  // 7. Length check: E.164 allows 7–15 digits after '+'
  //    (shortest valid: +X XXXXXX = 7 digits; longest: 15 digits)
  if (digits.length < 7) {
    throw new Error(
      `Phone number is too short (${digits.length} digit${digits.length === 1 ? "" : "s"} after country code — minimum 7).`
    );
  }
  if (digits.length > 15) {
    throw new Error(
      `Phone number is too long (${digits.length} digits — maximum 15 per E.164 standard).`
    );
  }

  return cleaned; // e.g. "+254712345678"
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorised" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      id:          user.id,
      clerkId:     user.clerkId,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      imageUrl:    user.imageUrl,
      isOnboarded: user.isOnboarded,
      role:        user.role,
      phoneNumber: user.phoneNumber,
      location:    user.location,
      categories:  user.categories
        ? user.categories.split(",").filter(Boolean)
        : [],
    });
  } catch (error) {
    console.error("[getMe] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/user/onboarding
// ─────────────────────────────────────────────────────────────────────────────
const completeOnboarding = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorised" });
    }

    const { role, phoneNumber, location, categories, firstName, lastName } =
      req.body;

    // ── Validate role ─────────────────────────────────────────────────────
    if (!role || !["poster", "tasker"].includes(role)) {
      return res.status(400).json({
        error: "role must be 'poster' or 'tasker'.",
      });
    }

    // ── Validate & normalise phone number ─────────────────────────────────
    let cleanPhone;
    try {
      cleanPhone = normalisePhone(phoneNumber);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // ── Validate location ─────────────────────────────────────────────────
    if (!location || location.trim().length < 2) {
      return res.status(400).json({
        error: "Location is required (at least 2 characters).",
      });
    }

    // ── Validate categories ───────────────────────────────────────────────
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: "Select at least one category.",
      });
    }

    const validCategories = [
      "webdesign",
      "cleaning",
      "plumbing",
      "electrical",
      "delivery",
      "tutoring",
      "photography",
      "moving",
      "gardening",
      "cooking",
      "beauty",
      "techsupport",
    ];
    const invalid = categories.filter((c) => !validCategories.includes(c));
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Invalid categories: ${invalid.join(", ")}.`,
      });
    }

    // ── Validate name ─────────────────────────────────────────────────────
    if (!firstName || firstName.trim().length < 1) {
      return res.status(400).json({ error: "First name is required." });
    }

    // ── Check phone uniqueness (excluding current user) ───────────────────
    const [existingPhone] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phoneNumber, cleanPhone))
      .limit(1);

    if (existingPhone && existingPhone.id !== clerkId) {
      return res.status(409).json({
        error:
          "This phone number is already linked to another account. Please use a different number.",
      });
    }

    // ── Persist ───────────────────────────────────────────────────────────
    await db
      .update(users)
      .set({
        role,
        phoneNumber:  cleanPhone,
        location:     location.trim(),
        categories:   categories.join(","),
        firstName:    firstName.trim(),
        lastName:     lastName?.trim() ?? null,
        isOnboarded:  true,
        updatedAt:    new Date(),
      })
      .where(eq(users.clerkId, clerkId));

    console.log(
      `[completeOnboarding] clerkId=${clerkId} role=${role} phone=${cleanPhone}`
    );

    return res.status(200).json({ success: true, isOnboarded: true });
  } catch (error) {
    // Handle DB unique constraint violation on phone_number
    if (
      error.code === "23505" ||
      (error.message && error.message.includes("unique"))
    ) {
      return res.status(409).json({
        error:
          "This phone number is already linked to another account. Please use a different number.",
      });
    }
    console.error("[completeOnboarding] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { getMe, completeOnboarding };
