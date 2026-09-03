import { v2 as cloudinary } from "cloudinary";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, users } from "../db/schema.js";
import { env } from "../utils/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const ALLOWED_PAYMENT_TYPES = ["fixed", "hourly", "negotiable"];
const ALLOWED_DURATIONS = [
  "Under 1 hour",
  "1-3 hours",
  "Half day",
  "Full day",
  "Multiple days",
];
const MAX_PHOTOS = 5;

function getClerkId(req) {
  return (
    req.auth?.userId ||
    req.headers["x-clerk-user-id"] ||
    req.body?.clerkId ||
    req.query?.clerkId
  );
}

// Sanitise and validate image data before sending to Cloudinary.
// Accepts either a full data URL ("data:image/png;base64,...") or raw base64.
function extractUploadData(photo) {
  if (!photo || typeof photo !== "string") {
    throw new Error("Each photo must be a non-empty string.");
  }
  // Reject obviously oversized payloads (roughly > 8 MB base64)
  if (photo.length > 12 * 1024 * 1024) {
    throw new Error("One of the images is too large (max ~8 MB per image).");
  }
  return photo;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts/upload
// Uploads one or more photos to Cloudinary and returns their secure URLs.
// Expects: { photos: string[] }  (each a data URL or raw base64)
// ─────────────────────────────────────────────────────────────────────────────
const uploadPhotos = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  const photos = req.body?.photos;
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: "photos must be a non-empty array." });
  }
  if (photos.length > MAX_PHOTOS) {
    return res
      .status(400)
      .json({ error: `A maximum of ${MAX_PHOTOS} photos is allowed.` });
  }

  let dataUrls;
  try {
    dataUrls = photos.map(extractUploadData);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const uploaded = [];
  try {
    // Upload sequentially to keep things simple and ordered.
    for (const dataUrl of dataUrls) {
      const result = await cloudinary.uploader.upload(dataUrl, {
        folder: "tasklink/posts",
        resource_type: "image",
        format: "webp",
        transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
      });
      uploaded.push(result.secure_url);
    }
    return res.status(200).json({ urls: uploaded });
  } catch (error) {
    console.error("[uploadPhotos] Cloudinary error:", error);
    // Cloudinary v2 throws { http_code, message } — surface a friendly message.
    return res.status(500).json({
      error: error.message || "Failed to upload photo. Please try again.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts
// Creates a new post record. Accepts optional photo URLs (already uploaded) or
// raw photos that will be uploaded to Cloudinary first.
// ─────────────────────────────────────────────────────────────────────────────
const createPost = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  const {
    title,
    category,
    description,
    location,
    budgetAmount,
    paymentType,
    dateNeeded,
    timeNeeded,
    isUrgent,
    duration,
    skills,
    photos,
    doerCount,
  } = req.body;

  // ── Validate required fields ─────────────────────────────────────────
  if (!title || title.trim().length < 1) {
    return res.status(400).json({ error: "Job title is required." });
  }
  if (!category || category.trim().length < 1) {
    return res.status(400).json({ error: "Category is required." });
  }
  if (!description || description.trim().length < 1) {
    return res.status(400).json({ error: "Description is required." });
  }
  if (!location || location.trim().length < 2) {
    return res.status(400).json({ error: "Location is required." });
  }
  if (!budgetAmount || String(budgetAmount).trim().length < 1) {
    return res.status(400).json({ error: "Budget is required." });
  }
  if (!dateNeeded || String(dateNeeded).trim().length < 1) {
    return res.status(400).json({ error: "Date is required." });
  }
  if (paymentType && !ALLOWED_PAYMENT_TYPES.includes(paymentType)) {
    return res
      .status(400)
      .json({ error: "paymentType must be fixed, hourly or negotiable." });
  }
  if (duration && !ALLOWED_DURATIONS.includes(duration)) {
    return res
      .status(400)
      .json({ error: "duration is not a valid option." });
  }

  // ── Resolve photos ───────────────────────────────────────────────────
  // photos may be an array of Cloudinary URLs (from /upload) or raw image
  // data (uploaded here). Normalise into a list of URLs.
  const rawPhotos = Array.isArray(photos) ? photos : [];
  if (rawPhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ error: "A maximum of 5 photos is allowed." });
  }

  const photoUrls = [];
  try {
    for (const photo of rawPhotos) {
      const isUrl = /^https?:\/\//.test(photo);
      if (isUrl) {
        photoUrls.push(photo);
      } else {
        const dataUrl = extractUploadData(photo);
        const result = await cloudinary.uploader.upload(dataUrl, {
          folder: "tasklink/posts",
          resource_type: "image",
          format: "webp",
          transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
        });
        photoUrls.push(result.secure_url);
      }
    }
  } catch (error) {
    console.error("[createPost] Photo upload error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to upload photo. Please try again." });
  }

  // ── Verify poster exists ─────────────────────────────────────────────
  const [poster] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!poster) {
    return res
      .status(404)
      .json({ error: "Poster account not found. Please complete setup first." });
  }

  // ── Insert ───────────────────────────────────────────────────────────
  const generatedId =
    "post_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

  const [created] = await db
    .insert(posts)
    .values({
      id: generatedId,
      posterId: poster.id,
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      location: location.trim(),
      budgetAmount: String(budgetAmount).trim(),
      paymentType: paymentType || "fixed",
      dateNeeded: String(dateNeeded).trim(),
      timeNeeded: timeNeeded ? String(timeNeeded).trim() : null,
      isUrgent: Boolean(isUrgent),
      duration: duration || null,
      skills: Array.isArray(skills)
        ? JSON.stringify(skills.filter((s) => s && String(s).trim()).map((s) => String(s).trim()))
        : skills
          ? String(skills).trim()
          : null,
      photos: JSON.stringify(photoUrls),
      doerCount: Math.min(Math.max(parseInt(doerCount, 10) || 1, 1), 5),
    })
    .returning();

  console.log(`[createPost] clerkId=${clerkId} postId=${created.id}`);

  return res.status(201).json({ success: true, post: created });
};

export { uploadPhotos, createPost };
