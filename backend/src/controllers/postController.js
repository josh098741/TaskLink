import { v2 as cloudinary } from "cloudinary";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, users } from "../db/schema.js";
import { env } from "../utils/env.js";

// Fields a post owner is allowed to edit while the post is still open.
const EDITABLE_FIELDS = [
  "title",
  "category",
  "description",
  "location",
  "budgetAmount",
  "paymentType",
  "dateNeeded",
  "timeNeeded",
  "isUrgent",
  "duration",
  "skills",
  "photos",
  "doerCount",
];

// Single source of truth for the public shape of a post (photos/skills parsed
// into arrays). acceptedBy is resolved to a booleans/name later if needed.
function serializePost(row) {
  return {
    ...row,
    photos: parseJsonArray(row.photos),
    skills: parseJsonArray(row.skills),
  };
}

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts/mine
// Returns all posts created by the currently authenticated user, newest first.
// ─────────────────────────────────────────────────────────────────────────────
const getMyPosts = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.posterId, clerkId))
      .orderBy(desc(posts.createdAt));

    const parsed = rows.map(serializePost);

    return res.status(200).json({ posts: parsed });
  } catch (error) {
    console.error("[getMyPosts] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load posts. Please try again." });
  }
};

// Safely parse a JSON-encoded text column. Falls back to the raw string if it
// isn't valid JSON (e.g. a plain skills string from older records).
function parseJsonArray(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return typeof value === "string" ? value : fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts
// Public browse of available posts. Optional query params:
//   ?category=<id>   filter by category id
//   ?status=open     filter by status (default: open)
//   ?q=<text>        search title/category/location/description
// Returns posts newest first, with photos/skills parsed into arrays.
// ─────────────────────────────────────────────────────────────────────────────
const listPosts = async (req, res) => {
  try {
    const { category, status, q } = req.query;
    const conditions = [];

    if (category && String(category).trim()) {
      conditions.push(eq(posts.category, String(category).trim()));
    }

    const statusFilter = status && String(status).trim()
      ? String(status).trim()
      : "open";
    conditions.push(eq(posts.status, statusFilter));

    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      conditions.push(or(
        ilike(posts.title, like),
        ilike(posts.category, like),
        ilike(posts.location, like),
        ilike(posts.description, like)
      ));
    }

    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        category: posts.category,
        description: posts.description,
        location: posts.location,
        budgetAmount: posts.budgetAmount,
        paymentType: posts.paymentType,
        dateNeeded: posts.dateNeeded,
        timeNeeded: posts.timeNeeded,
        isUrgent: posts.isUrgent,
        duration: posts.duration,
        skills: posts.skills,
        photos: posts.photos,
        doerCount: posts.doerCount,
        status: posts.status,
        acceptedBy: posts.acceptedBy,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    const parsed = rows.map(serializePost);

    return res.status(200).json({ count: parsed.length, posts: parsed });
  } catch (error) {
    console.error("[listPosts] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load posts. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/posts/:id
// Returns a single post by id. Public — any signed-in or anonymous viewer can
// fetch a post's details to decide whether to accept it.
// ─────────────────────────────────────────────────────────────────────────────
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.trim() === "") {
      return res.status(400).json({ error: "Post id is required." });
    }

    const [row] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, String(id).trim()))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Post not found." });
    }

    return res.status(200).json({ post: serializePost(row) });
  } catch (error) {
    console.error("[getPostById] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load post. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/posts/:id
// Edits a post. Only the owner may edit, and only while the post is still
// `open` (i.e. no doer has accepted it yet). Once accepted, details are locked.
// ─────────────────────────────────────────────────────────────────────────────
const updatePost = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, String(id).trim()))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (existing.posterId !== clerkId) {
      return res.status(403).json({ error: "You can only edit your own posts." });
    }

    if (existing.status !== "open") {
      return res
        .status(409)
        .json({
          error:
            "This post has already been accepted and its details can no longer be changed.",
        });
    }

    const body = req.body || {};
    const updates = {};
    for (const key of Object.keys(body)) {
      if (!EDITABLE_FIELDS.includes(key)) continue;

      const value = body[key];

      if (key === "skills") {
        updates.skills = Array.isArray(value)
          ? JSON.stringify(value.filter((s) => s && String(s).trim()).map((s) => String(s).trim()))
          : null;
      } else if (key === "photos") {
        updates.photos = JSON.stringify(
          (Array.isArray(value) ? value : []).filter(Boolean).map(String)
        );
      } else if (key === "isUrgent") {
        updates.isUrgent = Boolean(value);
      } else if (key === "doerCount") {
        updates.doerCount = Math.min(Math.max(parseInt(value, 10) || 1, 1), 5);
      } else if (value !== undefined) {
        updates[key] = typeof value === "string" ? value.trim() : value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No editable fields provided." });
    }

    const [updated] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, existing.id))
      .returning();

    console.log(`[updatePost] postId=${existing.id} fields=${Object.keys(updates).join(",")}`);
    return res.status(200).json({ post: serializePost(updated) });
  } catch (error) {
    console.error("[updatePost] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to update post. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/posts/:id
// Deletes a post. Only the owner may delete, and only while it is still open
// (no accepted doer). A post with an accepted doer cannot be deleted.
// ─────────────────────────────────────────────────────────────────────────────
const deletePost = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, String(id).trim()))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (existing.posterId !== clerkId) {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    if (existing.status !== "open") {
      return res
        .status(409)
        .json({
          error: "This post already has an accepted doer and can no longer be deleted.",
        });
    }

    await db.delete(posts).where(eq(posts.id, existing.id));

    console.log(`[deletePost] postId=${existing.id}`);
    return res.status(200).json({ success: true, id: existing.id });
  } catch (error) {
    console.error("[deletePost] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to delete post. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/posts/:id/accept
// A doer accepts an open post. Sets status -> `in_progress` and records who
// accepted (acceptedBy). Guards:
//   • The poster cannot accept their own post.
//   • Only `open` posts can be accepted.
//   • A post can only be accepted once.
//   • `doerCount > 1` posts can accept multiple doers up to the count.
// ─────────────────────────────────────────────────────────────────────────────
const acceptPost = async (req, res) => {
  const clerkId = getClerkId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, String(id).trim()))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Post not found." });
    }

    if (existing.posterId === clerkId) {
      return res
        .status(400)
        .json({ error: "You cannot accept a job you posted yourself." });
    }

    if (existing.status === "completed" || existing.status === "cancelled") {
      return res
        .status(409)
        .json({ error: "This post is no longer available." });
    }

    if (existing.status === "in_progress") {
      // Multi-doer posts: allow up to doerCount distinct acceptors.
      const acceptors = parseJsonArray(existing.acceptedBy, []);
      if (acceptors.length >= existing.doerCount) {
        return res
          .status(409)
          .json({ error: "This post has already been fully accepted." });
      }
      if (acceptors.includes(clerkId)) {
        return res
          .status(409)
          .json({ error: "You have already accepted this post." });
      }
    }

    // Guard the single-doer / fill-up transition atomically.
    const acceptors = parseJsonArray(existing.acceptedBy, []);
    if (!acceptors.includes(clerkId)) {
      acceptors.push(clerkId);
    }

    const nextStatus = acceptors.length >= Math.max(existing.doerCount, 1) ? "in_progress" : "open";

    const [updated] = await db
      .update(posts)
      .set({
        acceptedBy: JSON.stringify(acceptors),
        status: acceptors.length > 0 ? nextStatus : "open",
        updatedAt: new Date(),
      })
      .where(eq(posts.id, existing.id))
      .returning();

    console.log(`[acceptPost] postId=${existing.id} doer=${clerkId} status=${updated.status}`);
    return res.status(200).json({ post: serializePost(updated) });
  } catch (error) {
    console.error("[acceptPost] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to accept post. Please try again." });
  }
};

export {
  uploadPhotos,
  createPost,
  getMyPosts,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
  acceptPost,
};
