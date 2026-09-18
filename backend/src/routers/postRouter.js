import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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

postRouter.use(authenticate);

/**
 * GET /api/posts/mine
 * Returns the authenticated user's posts, newest first.
 */
postRouter.get("/posts/mine", getMyPosts);

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
 * A doer accepts an open post. Auth required.
 */
postRouter.post("/posts/:id/accept", acceptPost);

/**
 * PATCH /api/posts/:id
 * Edits a post while it is still open (owner only).
 */
postRouter.patch("/posts/:id", updatePost);

/**
 * DELETE /api/posts/:id
 * Deletes a post while it is still open (owner only).
 */
postRouter.delete("/posts/:id", deletePost);

/**
 * POST /api/posts/upload
 * Uploads one or more photos to Cloudinary and returns secure URLs.
 * Body: { photos: string[] }  (each a data URL or raw base64)
 */
postRouter.post("/posts/upload", uploadPhotos);

/**
 * POST /api/posts
 * Creates a new task post.
 */
postRouter.post("/posts", createPost);

export default postRouter;