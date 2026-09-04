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

/**
 * Compact key used to treat spaced/unspaced/multi-spaced variants of the same
 * term as one entry (e.g. "web development" and "webdevelopment" both get the
 * key "webdevelopment"). The controller merges rows that share a compact key
 * so only the most readable variant is ever surfaced.
 */
function compactKey(term) {
  return normaliseTerm(term).replace(/\s+/g, "");
}

function generateId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/**
 * Fetch every stored term and roll the rows that share a compact key back into
 * a single representative. Returns a list of { term, count } with no duplicates
 * and prefers the most readable (spaced) variant.
 */
async function consolidatedTerms() {
  const rows = await db
    .select({
      id: searchTerms.id,
      term: searchTerms.term,
      count: searchTerms.count,
      lastSearchedAt: searchTerms.lastSearchedAt,
    })
    .from(searchTerms);

  const byKey = new Map(); // compactKey -> { id, term, count, lastSearchedAt }
  for (const row of rows) {
    const key = compactKey(row.term);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        id: row.id,
        term: row.term,
        count: row.count,
        lastSearchedAt: row.lastSearchedAt,
      });
      continue;
    }
    // Merge counts into the representative row, preferring the spaced variant.
    const storedHasSpace = /\s/.test(existing.term);
    const incomingHasSpace = /\s/.test(row.term);
    if (incomingHasSpace && !storedHasSpace) {
      existing.term = row.term;
      existing.id = row.id;
    }
    existing.count += row.count;
    if (new Date(row.lastSearchedAt) > new Date(existing.lastSearchedAt)) {
      existing.lastSearchedAt = row.lastSearchedAt;
    }
  }

  return Array.from(byKey.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search/record
// Records a completed search term (full words only). Increments the counter
// when the same term is searched again, treating spaced/unspaced variants of
// the same term as equivalent. Body: { q: string }
// ─────────────────────────────────────────────────────────────────────────────
const recordSearch = async (req, res) => {
  const rawTerm = normaliseTerm(req.body?.q);
  if (!rawTerm) {
    return res.status(400).json({ error: "Search term is required." });
  }
  if (rawTerm.length > 120) {
    return res.status(400).json({ error: "Search term is too long." });
  }

  const incomingKey = compactKey(rawTerm);

  try {
    const terms = await consolidatedTerms();
    const match = terms.find((t) => compactKey(t.term) === incomingKey);

    if (match) {
      // Prefer showing the more readable (spaced) variant so we consistently
      // surface "web development" and never "webdevelopment".
      const storedHasSpace = /\s/.test(match.term);
      const incomingHasSpace = /\s/.test(rawTerm);
      const displayTerm =
        incomingHasSpace && !storedHasSpace ? rawTerm : match.term;

      // Update the representative row with the merged total and display term,
      // then delete any other rows that shared the same compact key so legacy
      // duplicates never show up again.
      await db.execute(
        `DELETE FROM "search_terms" WHERE "id" <> $1 AND lower(regexp_replace("term", '\s', '', 'g')) = $2`,
        [match.id, incomingKey]
      );
      await db.execute(
        `UPDATE "search_terms" SET "count" = $1, "last_searched_at" = now(), "term" = $2 WHERE "id" = $3`,
        [match.count + 1, displayTerm, match.id]
      );

      return res.status(200).json({ success: true, term: displayTerm });
    }

    await db.insert(searchTerms).values({
      id: generateId("term"),
      term: rawTerm,
      count: 1,
    });

    return res.status(200).json({ success: true, term: rawTerm });
  } catch (error) {
    console.error("[recordSearch] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to record search." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/popular
// Returns the most-searched (consolidated) terms, used for the pill list.
// Query: ?limit=3 (default 5)
// ─────────────────────────────────────────────────────────────────────────────
const getPopularSearches = async (req, res) => {
  try {
    const terms = await consolidatedTerms();
    terms.sort(
      (a, b) =>
        b.count - a.count ||
        new Date(b.lastSearchedAt ?? 0) - new Date(a.lastSearchedAt ?? 0)
    );

    const wanted = Math.min(Math.max(parseInt(req.query?.limit, 10) || 5, 1), 10);

    return res.status(200).json({ terms: terms.slice(0, wanted).map((t) => t.term) });
  } catch (error) {
    console.error("[getPopularSearches] error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to load popular searches." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/suggest?q=text
// Returns autocomplete suggestions (full, consolidated terms) for a partial
// query. Also lets the raw query appear if it's a fresh term.
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
    // Pull candidates matching either the spaced term or its compact form, so
    // typing "webdevelopment" still surfaces the stored "web development".
    const keyLike = `%${compactKey(q)}%`;
    const rows = await db
      .select({ term: searchTerms.term, count: searchTerms.count, lastSearchedAt: searchTerms.lastSearchedAt })
      .from(searchTerms)
      .where(ilike(searchTerms.term, `%${q}%`))
      .orderBy(desc(searchTerms.count), desc(searchTerms.lastSearchedAt))
      .limit(40);

    // Consolidate any duplicate variants before ranking.
    const byKey = new Map();
    for (const row of rows) {
      const key = compactKey(row.term);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { term: row.term, count: row.count });
        continue;
      }
      const storedHasSpace = /\s/.test(existing.term);
      const incomingHasSpace = /\s/.test(row.term);
      if (incomingHasSpace && !storedHasSpace) existing.term = row.term;
      existing.count += row.count;
    }

    const suggestions = Array.from(byKey.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => t.term);

    // Also match against the compact key so unspaced typing still finds the
    // spaced stored term even when the literal substring differs.
    if (suggestions.length === 0) {
      const keyRows = await db
        .select({ term: searchTerms.term })
        .from(searchTerms)
        .where(ilike(searchTerms.term, keyLike))
        .orderBy(desc(searchTerms.count))
        .limit(8);
      for (const r of keyRows) {
        if (!suggestions.includes(r.term)) suggestions.push(r.term);
      }
    }

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
