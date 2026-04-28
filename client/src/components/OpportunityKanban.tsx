import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { OpportunityListView } from "./OpportunityListView";
import { KanbanBoard } from "./kanban/KanbanBoard";
import { FilterBar } from "./FilterBar";
import { useOpportunityFilters } from "@/hooks/useOpportunityFilters";
import { Button } from "@/components/ui/button";
import { Loader2, Kanban as KanbanIcon, LayoutGrid, List } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * OpportunityKanban — Orchestrator component.
 *
 * Responsible for:
 *  - Pipeline selection
 *  - View mode toggle (kanban / list)
 *  - Data fetching (pipelines + opportunities)
 *  - Filter orchestration via useOpportunityFilters
 *  - Delegating filtered data to <KanbanBoard> or <OpportunityListView>
 */
export function OpportunityKanban() {
  const { data: pipelines, isLoading: loadingPipes } = trpc.pipelines.list.useQuery();
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Auto-select first pipeline
  useEffect(() => {
    if (!activePipelineId && pipelines && pipelines.length > 0) {
      setActivePipelineId(pipelines[0].id.toString());
    }
  }, [activePipelineId, pipelines]);

  const { data: opportunities, isLoading: loadingOpps } = trpc.opportunities.list.useQuery(
    { pipelineId: activePipelineId ? parseInt(activePipelineId) : undefined },
    { enabled: !!activePipelineId }
  );

  const activePipeline = pipelines?.find(p => p.id.toString() === activePipelineId);
  const allStages = activePipeline?.stages || [];
  
  // Ocultar colunas finais conforme solicitado pelo usuário
  const hiddenStageNames = ['Perdido', 'Abandonado', 'Ganho'];
  const stages = allStages.filter(s => !hiddenStageNames.includes(s.name));
  
  // Filtrar também as oportunidades que estão nessas colunas para que não apareçam na lista
  const visibleOpportunities = opportunities?.filter(o => {
    const stage = allStages.find(s => s.id === o.stageId);
    return stage && !hiddenStageNames.includes(stage.name);
  });

  // ── Filter System ──
  const {
    filters,
    updateFilter,
    clearFilters,
    removeFilter,
    filteredOpportunities,
    activeFilterCount,
    isFiltered,
  } = useOpportunityFilters(visibleOpportunities, stages);

  if (loadingPipes) return (
    <div className="flex justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <KanbanIcon className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={activePipelineId} onValueChange={setActivePipelineId}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Selecione um Funil..." />
            </SelectTrigger>
            <SelectContent>
              {pipelines?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex bg-muted/50 p-1 rounded-md border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Visualização em Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <OpportunityFormDialog defaultPipelineId={parseInt(activePipelineId)} />
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        removeFilter={removeFilter}
        activeFilterCount={activeFilterCount}
        isFiltered={isFiltered}
        stages={stages}
      />

      {/* Main Content Area */}
      {viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <OpportunityListView
            opportunities={filteredOpportunities}
            stages={stages}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-container">
          <KanbanBoard
            stages={stages}
            opportunities={filteredOpportunities}
            isLoading={loadingOpps}
            pipelineId={activePipelineId}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />
        </div>
      )}
    </div>
  );
}
