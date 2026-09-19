/**
 * Experience Filter Utility
 *
 * Parses messy experience strings from different job platforms into
 * normalized numeric ranges, and provides filter-matching logic.
 *
 * Supported inputs:
 *   "0-2 Yrs", "3 - 5 years", "5-8", "2+ years", "Fresher",
 *   "0 Yrs", "10 Yrs", "1 to 3 years", "Not disclosed"
 */

/**
 * Filter option definitions used by the SearchBar dropdown.
 * Each option has a label for display and a value used as filter key.
 */
export const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'All Experience' },
  { value: '0-1', label: 'Fresher (0–1 yrs)' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

/**
 * Parse an experience string into a numeric { min, max } object.
 *
 * @param {string} expString - Raw experience text from a job listing
 * @returns {{ min: number, max: number } | null} - Parsed range or null if unparseable
 *
 * @example
 *   parseExperience("0-2 Yrs")    → { min: 0, max: 2 }
 *   parseExperience("5+ years")   → { min: 5, max: 99 }
 *   parseExperience("Fresher")    → { min: 0, max: 1 }
 *   parseExperience("")           → null
 */
export function parseExperience(expString) {
  if (!expString || typeof expString !== 'string') return null;

  const text = expString.trim().toLowerCase();

  // Skip known non-values
  if (!text || text === 'not disclosed' || text === 'n/a' || text === '-') {
    return null;
  }

  // "Fresher" / "fresher" / "entry level"
  if (/\bfresher\b/i.test(text) || /\bentry\s*level\b/i.test(text)) {
    return { min: 0, max: 1 };
  }

  // Range: "0-2", "3 - 5 Yrs", "1 to 3 years", "2–5 years"
  const rangeMatch = text.match(
    /(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?|yr)?/i
  );
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };
  }

  // "5+ years", "10+"
  const plusMatch = text.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:yrs?|years?|yr)?/i);
  if (plusMatch) {
    return { min: parseFloat(plusMatch[1]), max: 99 };
  }

  // Single number: "5 Yrs", "3 years", "0 Yrs"
  const singleMatch = text.match(/^(\d+(?:\.\d+)?)\s*(?:yrs?|years?|yr)?$/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    return { min: val, max: val };
  }

  return null;
}

/**
 * Get the filter range for a given dropdown value.
 *
 * @param {string} filterValue - One of the EXPERIENCE_OPTIONS values
 * @returns {{ min: number, max: number } | null}
 */
function getFilterRange(filterValue) {
  switch (filterValue) {
    case '0-1':
      return { min: 0, max: 1 };
    case '1-3':
      return { min: 1, max: 3 };
    case '3-5':
      return { min: 3, max: 5 };
    case '5-10':
      return { min: 5, max: 10 };
    case '10+':
      return { min: 10, max: 99 };
    default:
      return null;
  }
}

/**
 * Check if two numeric ranges overlap.
 * Ranges [a1, a2] and [b1, b2] overlap when a1 <= b2 AND b1 <= a2.
 */
function rangesOverlap(a, b) {
  return a.min <= b.max && b.min <= a.max;
}

/**
 * Determine if a job matches the selected experience filter.
 *
 * - If filterValue is 'all', every job matches.
 * - If the job has no parseable experience data, it's treated as "unknown"
 *   and included (with an "Experience Unknown" indicator).
 * - Otherwise, uses overlap-based range matching.
 *
 * @param {object} job - Job object with an `experience` field
 * @param {string} filterValue - Selected filter value from dropdown
 * @returns {{ matches: boolean, unknown: boolean }}
 */
export function matchesExperienceFilter(job, filterValue) {
  // No filter applied — everything matches
  if (!filterValue || filterValue === 'all') {
    return { matches: true, unknown: false };
  }

  const parsed = parseExperience(job.experience);
  const filterRange = getFilterRange(filterValue);

  // Job has no experience data — "unknown"
  if (!parsed) {
    return { matches: true, unknown: true };
  }

  // Filter range couldn't be resolved (shouldn't happen)
  if (!filterRange) {
    return { matches: true, unknown: false };
  }

  // Overlap check
  return { matches: rangesOverlap(parsed, filterRange), unknown: false };
}
