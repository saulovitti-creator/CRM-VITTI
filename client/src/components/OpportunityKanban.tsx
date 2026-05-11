import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { OpportunityListView } from "./OpportunityListView";
import { OpportunityHistoryView } from "./OpportunityHistoryView";
import { KanbanBoard } from "./kanban/KanbanBoard";
import { FilterBar } from "./FilterBar";
import { useOpportunityFilters } from "@/hooks/useOpportunityFilters";
import { Loader2, Kanban as KanbanIcon, LayoutGrid, List, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type OpportunityRow = {
  id: number;
  title: string;
  contactName?: string;
  contactCompany?: string;
  contactPhone?: string;
  contactEmail?: string;
  stageName?: string;
  monetaryValue?: string | number | null;
  source?: string | null;
  status?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

function formatDateBr(value?: string | Date) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

export function OpportunityKanban() {
  const { data: pipelines, isLoading: loadingPipes } = trpc.pipelines.list.useQuery();
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [activeView, setActiveView] = useState<"active" | "history">("active");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

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
  const stages = allStages.filter(s => s.isActiveInFunnel !== false);
  const activeStageIds = new Set(stages.map(s => s.id));

  // Kanban ativo: mostra apenas oportunidades abertas em estagios ativos.
  const visibleOpportunities = opportunities?.filter(
    opportunity => opportunity.status === "open" && activeStageIds.has(opportunity.stageId)
  );

  const {
    filters,
    updateFilter,
    clearFilters,
    removeFilter,
    filteredOpportunities,
    activeFilterCount,
    isFiltered,
  } = useOpportunityFilters(visibleOpportunities, stages);

  const handleExportXlsx = () => {
    const exportRows = (filteredOpportunities || []) as OpportunityRow[];
    if (exportRows.length === 0) {
      toast.info("Não há oportunidades abertas para exportar neste funil.");
      return;
    }

    const pipelineName = activePipeline?.name || "";
    const sheetRows = exportRows.map((opportunity) => ({
      "ID da Oportunidade": opportunity.id,
      "Nome da Oportunidade": opportunity.title || "",
      "Empresa": opportunity.contactCompany || "",
      "Nome do Contato": opportunity.contactName || "",
      "Telefone": opportunity.contactPhone || "",
      "Email": opportunity.contactEmail || "",
      "Pipeline": pipelineName,
      "Estágio": opportunity.stageName || "",
      "Valor Estimado": normalizeMoney(opportunity.monetaryValue),
      "Origem": opportunity.source || "",
      "Status": opportunity.status === "open" ? "Aberta" : (opportunity.status || ""),
      "Criado em": formatDateBr(opportunity.createdAt),
      "Atualizado em": formatDateBr(opportunity.updatedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    worksheet["!cols"] = [
      { wch: 18 }, { wch: 34 }, { wch: 28 }, { wch: 28 }, { wch: 18 },
      { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 16 },
      { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Oportunidades");

    const datePart = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `funil_crm_vitti_${datePart}.xlsx`);
    toast.success(`Exportação concluída (${exportRows.length} oportunidade(s)).`);
  };

  if (loadingPipes) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <KanbanIcon className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={activePipelineId} onValueChange={setActivePipelineId}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Selecione um Funil..." />
            </SelectTrigger>
            <SelectContent>
              {pipelines?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-muted/50 p-1 rounded-md border border-border">
            <button
              onClick={() => setActiveView("active")}
              className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                activeView === "active"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Funil ativo"
            >
              Funil Ativo
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
                activeView === "history"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Historico de oportunidades finalizadas"
            >
              Historico
            </button>
          </div>

          {activeView === "active" && (
            <div className="flex bg-muted/50 p-1 rounded-md border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Visualizacao em Kanban"
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
              title="Visualizacao em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeView === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXlsx}
              disabled={loadingOpps}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar XLSX
            </Button>
          )}
          <OpportunityFormDialog defaultPipelineId={parseInt(activePipelineId)} />
        </div>
      </div>

      {activeView === "active" ? (
        <>
          <FilterBar
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            removeFilter={removeFilter}
            activeFilterCount={activeFilterCount}
            isFiltered={isFiltered}
            stages={stages}
          />

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
        </>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <OpportunityHistoryView pipelineId={activePipelineId ? parseInt(activePipelineId) : undefined} />
        </div>
      )}
    </div>
  );
}
