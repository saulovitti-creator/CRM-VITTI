import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import {
  FilterState,
  EMPTY_FILTERS,
  applyFilters,
  countActiveFilters,
  hasActiveFilters,
} from "@/lib/filter-utils";

/**
 * useOpportunityFilters
 *
 * Centralized hook that manages filter state, URL synchronization,
 * debounced search, and filtered results for both Kanban and List views.
 */
export function useOpportunityFilters(
  opportunities: any[] | undefined,
  stages: Array<{ id: number; name: string }>
) {
  const searchString = useSearch();
  const [location, setLocation] = useLocation();

  // ── Initialize filters from URL query params ──
  const initialFilters = useMemo((): FilterState => {
    const searchParams = new URLSearchParams(searchString || "");
    const search = searchParams.get("q") || "";
    const name = searchParams.get("nome") || "";
    const phone = searchParams.get("telefone") || "";
    const stageIdsRaw = searchParams.get("status") || "";
    const dateFrom = searchParams.get("de") || null;
    const dateTo = searchParams.get("ate") || null;
    const valueMin = searchParams.get("valor_min") || "";
    const valueMax = searchParams.get("valor_max") || "";

    const stageIds = stageIdsRaw
      ? stageIdsRaw.split(",").map((n: string) => Number(n)).filter((n: number) => !isNaN(n))
      : [];

    return { search, name, phone, stageIds, dateFrom, dateTo, valueMin, valueMax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // ── Debounced search ──
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 250);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters.search]);

  // ── Build effective filters (with debounced search) ──
  const effectiveFilters = useMemo(
    (): FilterState => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  // ── Apply filters ──
  const filteredOpportunities = useMemo(
    () => applyFilters(opportunities || [], effectiveFilters),
    [opportunities, effectiveFilters]
  );

  // ── Sync filters → URL (skip debounced search, use raw for URL) ──
  useEffect(() => {
    const searchParams = new URLSearchParams(searchString || "");
    const params = new URLSearchParams();

    // Preserve existing non-filter params
    searchParams.forEach((value: string, key: string) => {
      if (!["q", "nome", "telefone", "status", "de", "ate", "valor_min", "valor_max"].includes(key)) {
        params.set(key, value);
      }
    });

    if (filters.search.trim()) params.set("q", filters.search.trim());
    if (filters.name.trim()) params.set("nome", filters.name.trim());
    if (filters.phone.trim()) params.set("telefone", filters.phone.trim());
    if (filters.stageIds.length > 0) params.set("status", filters.stageIds.join(","));
    if (filters.dateFrom) params.set("de", filters.dateFrom);
    if (filters.dateTo) params.set("ate", filters.dateTo);
    if (filters.valueMin.trim()) params.set("valor_min", filters.valueMin.trim());
    if (filters.valueMax.trim()) params.set("valor_max", filters.valueMax.trim());

    const newQuery = params.toString();
    setLocation(newQuery ? `${location}?${newQuery}` : location, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Mutation helpers ──
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const removeFilter = useCallback((key: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [key]: EMPTY_FILTERS[key],
    }));
  }, []);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  const isFiltered = useMemo(
    () => hasActiveFilters(filters),
    [filters]
  );

  return {
    filters,
    updateFilter,
    clearFilters,
    removeFilter,
    filteredOpportunities,
    activeFilterCount,
    isFiltered,
  };
}
