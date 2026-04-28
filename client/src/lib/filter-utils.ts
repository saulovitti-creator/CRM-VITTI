/**
 * filter-utils.ts
 *
 * Pure utility functions for filtering opportunities.
 * All functions are stateless, testable, and reusable across the CRM.
 */

// ─── String Normalization ────────────────────────────────────────────

/**
 * Removes accents, converts to lowercase, and trims extra whitespace.
 * "José da Silva" → "jose da silva"
 * "AÇÃO"          → "acao"
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .normalize("NFD")                    // Decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")     // Strip diacritical marks
    .toLowerCase()
    .replace(/\s+/g, " ")               // Collapse whitespace
    .trim();
}

/**
 * Strips all non-digit characters from a phone string for comparison.
 * "(14) 99999-0000" → "14999990000"
 */
export function normalizePhone(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\D/g, "");
}

// ─── Filter State Interface ─────────────────────────────────────────

export interface FilterState {
  search: string;           // Global search across all fields
  name: string;             // Partial match on contactName
  phone: string;            // Partial match on phone (normalized)
  stageIds: number[];       // Multi-select stages (OR within)
  dateFrom: string | null;  // ISO date start
  dateTo: string | null;    // ISO date end
  valueMin: string;         // Minimum monetary value (raw number)
  valueMax: string;         // Maximum monetary value (raw number)
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  name: "",
  phone: "",
  stageIds: [],
  dateFrom: null,
  dateTo: null,
  valueMin: "",
  valueMax: "",
};

/**
 * Returns true if any filter is active (non-default).
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.name.trim() !== "" ||
    filters.phone.trim() !== "" ||
    filters.stageIds.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.valueMin.trim() !== "" ||
    filters.valueMax.trim() !== ""
  );
}

/**
 * Counts the number of active filters (for badge display).
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.name.trim()) count++;
  if (filters.phone.trim()) count++;
  if (filters.stageIds.length > 0) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.valueMin.trim() || filters.valueMax.trim()) count++;
  return count;
}

// ─── Core Filtering Engine ──────────────────────────────────────────

/**
 * Applies all active filters to an array of opportunities.
 *
 * Logic:
 *  - AND between different filter types
 *  - OR within multi-select filters (e.g., stageIds)
 *
 * @param opportunities - Full array of enriched opportunities from the API
 * @param filters - Current filter state
 * @returns Filtered array (never mutates the original)
 */
export function applyFilters(
  opportunities: any[],
  filters: FilterState
): any[] {
  if (!opportunities || opportunities.length === 0) return [];
  if (!hasActiveFilters(filters)) return opportunities;

  return opportunities.filter((opp) => {
    // ── Global Search (matches ANY field) ──
    if (filters.search.trim()) {
      const needle = normalizeString(filters.search);
      const haystack = [
        opp.title,
        opp.contactName,
        opp.contactCompany,
        opp.contactPhone,
        opp.contactEmail,
        opp.source,
        opp.notes,
        opp.stageName,
      ]
        .map(normalizeString)
        .join(" ");

      if (!haystack.includes(needle)) return false;
    }

    // ── Name Filter (partial match on contactName) ──
    if (filters.name.trim()) {
      const needle = normalizeString(filters.name);
      const contactNorm = normalizeString(opp.contactName);
      const titleNorm = normalizeString(opp.title);
      if (!contactNorm.includes(needle) && !titleNorm.includes(needle)) return false;
    }

    // ── Phone Filter (digit-only partial match) ──
    if (filters.phone.trim()) {
      const needle = normalizePhone(filters.phone);
      const oppPhone = normalizePhone(opp.contactPhone);
      if (!oppPhone.includes(needle)) return false;
    }

    // ── Stage Filter (multi-select, OR logic) ──
    if (filters.stageIds.length > 0) {
      if (!filters.stageIds.includes(opp.stageId)) return false;
    }

    // ── Date Range Filter (createdAt) ──
    if (filters.dateFrom) {
      const oppDate = new Date(opp.createdAt);
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (oppDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const oppDate = new Date(opp.createdAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (oppDate > toDate) return false;
    }

    // ── Monetary Value Range Filter ──
    if (filters.valueMin.trim()) {
      const min = parseFloat(filters.valueMin);
      const oppValue = parseFloat(opp.monetaryValue) || 0;
      if (!isNaN(min) && oppValue < min) return false;
    }
    if (filters.valueMax.trim()) {
      const max = parseFloat(filters.valueMax);
      const oppValue = parseFloat(opp.monetaryValue) || 0;
      if (!isNaN(max) && oppValue > max) return false;
    }

    // ── All filters passed ──
    return true;
  });
}
