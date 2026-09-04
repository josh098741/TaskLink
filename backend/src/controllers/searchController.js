import { eq, desc, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import { searchTerms } from "../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a search term for storage and comparison:
 *   - lowercases, trims and collapses interior whitespace
 *   - stores FULL words (never partial keystrokes)
 */
function normaliseTerm(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search/record
// Records a completed search term (full words only). Increments the counter
// when the same term is searched again.
// Body: { q: string }
// ─────────────────────────────────────────────────────────────────────────────
const recordSearch = async (req, res) => {
  const term = normaliseTerm(req.body?.q);
  if (!term) {
    return res.status(400).json({ error: "Search term is required." });
  }
  if (term.length > 120) {
    return res.status(400).json({ error: "Search term is too long." });
  }

  try {
    const [existing] = await db
      .select({ id: searchTerms.id })
      .from(searchTerms)
      .where(eq(searchTerms.term, term))
      .limit(1);

    if (existing) {
      // Increment count and refresh the last-searched timestamp atomically.
      await db.execute(
        `UPDATE "search_terms" SET "count" = "count" + 1, "last_searched_at" = now() WHERE "id" = $1`,
        [existing.id]
      );
    } else {
      await db.insert(searchTerms).values({
        id: generateId("term"),
        term,
        count: 1,
      });
    }

    return res.status(200).json({ success: true, term });
  } catch (error) {
    console.error("[recordSearch] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to record search." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/popular
// Returns the most-searched terms (ranked by count), used for the pill list.
// Query: ?limit=3 (default 5)
// ─────────────────────────────────────────────────────────────────────────────
const getPopularSearches = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 5, 1), 10);
    const rows = await db
      .select({ term: searchTerms.term, count: searchTerms.count })
      .from(searchTerms)
      .orderBy(desc(searchTerms.count), desc(searchTerms.lastSearchedAt))
      .limit(limit);

    return res.status(200).json({ terms: rows.map((r) => r.term) });
  } catch (error) {
    console.error("[getPopularSearches] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load popular searches." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/suggest?q=text
// Returns autocomplete suggestions based on a partial query. Matches against
// stored search terms (whole-word prefixes / substrings) and returns full
// terms. Also allows the raw query to appear if it's a fresh term.
// ─────────────────────────────────────────────────────────────────────────────
const getSearchSuggestions = async (req, res) => {
  const q = normaliseTerm(req.query?.q);
  if (!q) {
    return res.status(200).json({ suggestions: [] });
  }
  if (q.length > 120) {
    return res.status(400).json({ error: "Query is too long." });
  }

  try {
    const like = `%${q}%`;
    const rows = await db
      .select({ term: searchTerms.term, count: searchTerms.count })
      .from(searchTerms)
      .where(ilike(searchTerms.term, like))
      .orderBy(desc(searchTerms.count))
      .limit(8);

    const suggestions = rows.map((r) => r.term);

    // Always offer the completed term itself if it isn't already present, so a
    // fresh search is actionable even before it has been recorded.
    if (suggestions.length === 0 || !suggestions.includes(q)) {
      suggestions.push(q);
    }

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error("[getSearchSuggestions] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load suggestions." });
  }
};

export { recordSearch, getPopularSearches, getSearchSuggestions };
