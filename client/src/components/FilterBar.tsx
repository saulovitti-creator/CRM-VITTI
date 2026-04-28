import { useState } from "react";
import { Search, SlidersHorizontal, X, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FilterState, EMPTY_FILTERS } from "@/lib/filter-utils";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterBarProps {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  removeFilter: (key: keyof FilterState) => void;
  activeFilterCount: number;
  isFiltered: boolean;
  stages: Array<{ id: number; name: string; color?: string | null }>;
}

/**
 * FilterBar — Enterprise filter bar with collapsible panel,
 * active filter tags, global search, and field-level filters.
 */
export function FilterBar({
  filters,
  updateFilter,
  clearFilters,
  removeFilter,
  activeFilterCount,
  isFiltered,
  stages,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Active filter labels for tag chips ──
  const activeFilterTags: Array<{ key: keyof FilterState; label: string }> = [];

  if (filters.name.trim()) {
    activeFilterTags.push({ key: "name", label: `Nome: "${filters.name}"` });
  }
  if (filters.phone.trim()) {
    activeFilterTags.push({ key: "phone", label: `Tel: ${filters.phone}` });
  }
  if (filters.stageIds.length > 0) {
    const stageNames = filters.stageIds
      .map((id) => stages.find((s) => s.id === id)?.name || id)
      .join(", ");
    activeFilterTags.push({ key: "stageIds", label: `Status: ${stageNames}` });
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? format(new Date(filters.dateFrom), "dd/MM/yy") : "…";
    const to = filters.dateTo ? format(new Date(filters.dateTo), "dd/MM/yy") : "…";
    activeFilterTags.push({ key: "dateFrom", label: `Data: ${from} — ${to}` });
  }
  if (filters.valueMin.trim() || filters.valueMax.trim()) {
    const min = filters.valueMin ? formatCurrency(filters.valueMin) : "…";
    const max = filters.valueMax ? formatCurrency(filters.valueMax) : "…";
    activeFilterTags.push({ key: "valueMin", label: `Valor: ${min} — ${max}` });
  }

  return (
    <div className="mb-4 space-y-2">
      {/* ═══ Top Row: Search + Filter Toggle + Clear ═══ */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Global Search — always visible */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Buscar em todos os campos..."
            className="pl-9 bg-card"
            id="filter-global-search"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1.5 relative"
          id="filter-toggle-btn"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
        </Button>

        {/* Clear All */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-destructive gap-1"
            id="filter-clear-all"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* ═══ Active Filter Tags ═══ */}
      {activeFilterTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 filter-tags-enter">
          {activeFilterTags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              {tag.label}
              <button
                onClick={() => {
                  removeFilter(tag.key);
                  // If removing date, also remove dateTo
                  if (tag.key === "dateFrom") removeFilter("dateTo");
                  // If removing value, also remove valueMax
                  if (tag.key === "valueMin") removeFilter("valueMax");
                }}
                className="hover:text-destructive ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ═══ Collapsible Filter Panel ═══ */}
      <div
        className={`filter-panel-collapse overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-card border rounded-xl p-4 shadow-[var(--shadow-sm)] space-y-4">
          {/* Row 1: Name, Phone, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome / Título</label>
              <Input
                value={filters.name}
                onChange={(e) => updateFilter("name", e.target.value)}
                placeholder="Ex: Maria, Energia Solar..."
                className="text-sm"
                id="filter-name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
              <Input
                value={filters.phone}
                onChange={(e) => updateFilter("phone", e.target.value)}
                placeholder="Ex: 14999..."
                className="text-sm"
                inputMode="numeric"
                id="filter-phone"
              />
            </div>

            {/* Status (Multi-select) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status / Estágio</label>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[38px] max-h-[80px] overflow-y-auto">
                {stages.map((stage) => {
                  const isActive = filters.stageIds.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        const newIds = isActive
                          ? filters.stageIds.filter((id) => id !== stage.id)
                          : [...filters.stageIds, stage.id];
                        updateFilter("stageIds", newIds);
                      }}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                      style={
                        isActive && stage.color
                          ? { backgroundColor: stage.color, borderColor: stage.color }
                          : undefined
                      }
                    >
                      {stage.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Dates + Values */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left text-sm font-normal gap-1.5"
                    id="filter-date-from"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {filters.dateFrom
                      ? format(new Date(filters.dateFrom), "dd/MM/yyyy")
                      : "Selecionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date) =>
                      updateFilter("dateFrom", date ? date.toISOString().split("T")[0] : null)
                    }
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data até</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left text-sm font-normal gap-1.5"
                    id="filter-date-to"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {filters.dateTo
                      ? format(new Date(filters.dateTo), "dd/MM/yyyy")
                      : "Selecionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) =>
                      updateFilter("dateTo", date ? date.toISOString().split("T")[0] : null)
                    }
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Value Min */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor de</label>
              <CurrencyInput
                value={filters.valueMin}
                onValueChange={(val) => updateFilter("valueMin", val)}
                placeholder="R$ 0"
                className="text-sm"
                id="filter-value-min"
              />
            </div>

            {/* Value Max */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor até</label>
              <CurrencyInput
                value={filters.valueMax}
                onValueChange={(val) => updateFilter("valueMax", val)}
                placeholder="R$ 999.999"
                className="text-sm"
                id="filter-value-max"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
