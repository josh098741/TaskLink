import { Router } from "express";
import {
  recordSearch,
  getPopularSearches,
  getSearchSuggestions,
} from "../controllers/searchController.js";

const searchRouter = Router();

/**
 * GET /api/search/popular
 * Most-searched jobs, ranked by usage. Used for the "most searched" pills.
 */
searchRouter.get("/search/popular", getPopularSearches);

/**
 * GET /api/search/suggest?q=text
 * Autocomplete suggestions for a partial query (returns full words).
 */
searchRouter.get("/search/suggest", getSearchSuggestions);

/**
 * POST /api/search/record
 * Records a completed search term (full words only).
 * Body: { q: string }
 */
searchRouter.post("/search/record", recordSearch);

export default searchRouter;
