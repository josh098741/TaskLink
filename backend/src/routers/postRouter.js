import { Router } from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  uploadPhotos,
  createPost,
  getMyPosts,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
  acceptPost,
} from "../controllers/postController.js";

const postRouter = Router();

postRouter.use(clerkMiddleware());

/**
 * Resilient auth middleware
 * Uses req.auth.userId, then falls back to x-clerk-user-id header or body clerkId.
 */
const requireUserAuth = (req, res, next) => {
  const clerkId =
    req.auth?.userId ||
    req.headers["x-clerk-user-id"] ||
    req.body?.clerkId;

  if (!clerkId || typeof clerkId !== "string" || clerkId.trim() === "") {
    return res.status(401).json({ error: "Unauthorised" });
  }

  req.auth = { ...(req.auth || {}), userId: clerkId.trim() };
  next();
};

/**
 * GET /api/posts/mine
 * Returns the authenticated user's posts, newest first.
 */
postRouter.get("/posts/mine", requireUserAuth, getMyPosts);

/**
 * GET /api/posts
 * Public browse of available posts, optionally filtered by ?category, ?status, ?q.
 */
postRouter.get("/posts", listPosts);

/**
 * GET /api/posts/:id
 * Public view of a single post.
 */
postRouter.get("/posts/:id", getPostById);

/**
 * POST /api/posts/:id/accept
 * A doer accepts an open job. Auth required.
 */
postRouter.post("/posts/:id/accept", requireUserAuth, acceptPost);

/**
 * PATCH /api/posts/:id
 * Edits a post while it is still open (owner only).
 */
postRouter.patch("/posts/:id", requireUserAuth, updatePost);

/**
 * DELETE /api/posts/:id
 * Deletes a post while it is still open (owner only).
 */
postRouter.delete("/posts/:id", requireUserAuth, deletePost);

/**
 * POST /api/posts/upload
 * Uploads one or more photos to Cloudinary and returns secure URLs.
 * Body: { photos: string[] }  (each a data URL or raw base64)
 */
postRouter.post("/posts/upload", requireUserAuth, uploadPhotos);

/**
 * POST /api/posts
 * Creates a new task post.
 */
postRouter.post("/posts", requireUserAuth, createPost);

export default postRouter;
