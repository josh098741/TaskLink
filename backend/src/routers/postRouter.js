import { Router } from "express";
import { clerkMiddleware } from "@clerk/express";
import { uploadPhotos, createPost, getMyPosts } from "../controllers/postController.js";

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
