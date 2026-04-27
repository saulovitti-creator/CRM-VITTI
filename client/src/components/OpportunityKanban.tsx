import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { Loader2, Kanban as KanbanIcon, Plus, Building, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OpportunityListView } from "./OpportunityListView";
import { LayoutGrid, List } from "lucide-react";
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Premium Opportunity Card — Attio/Pipedrive style
function SimpleOppCard({ opp }: { opp: any }) {
  const deleteMutation = trpc.opportunities.delete.useMutation();
  const utils = trpc.useUtils();

  return (
    <div className="bg-card p-3 rounded-[10px] border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-150 mb-2 group relative">
      {/* Title + Delete */}
      <div className="flex justify-between items-start mb-1.5">
        <h4 className="text-card-title cursor-grab active:cursor-grabbing leading-snug pr-2">{opp.title}</h4>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isto excluirá permanentemente a oportunidade e os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync({ id: opp.id });
                    utils.opportunities.list.invalidate();
                    toast.success("Oportunidade excluída com sucesso");
                  } catch (error: any) {
                    toast.error("Erro ao excluir: " + error.message);
                  }
                }}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Company */}
      <div className="flex items-center text-xs text-muted-foreground mb-2 cursor-grab active:cursor-grabbing">
        <Building className="w-3 h-3 mr-1.5 shrink-0" />
        <span className="truncate">{opp.contactName} {opp.contactCompany ? `(${opp.contactCompany})` : ""}</span>
      </div>

      {/* Value */}
      {opp.monetaryValue !== null && opp.monetaryValue !== undefined && opp.monetaryValue !== "" && (
        <div className="text-sm font-semibold text-primary tabular-nums cursor-grab active:cursor-grabbing">
          R$ {Number(opp.monetaryValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}

      {/* Edit link */}
      <div className="mt-2.5 flex justify-end">
        <OpportunityFormDialog 
          opportunity={opp} 
          trigger={
            <span className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              Editar
            </span>
          } 
        />
      </div>
    </div>
  );
}

export function OpportunityKanban() {
  const { data: pipelines, isLoading: loadingPipes } = trpc.pipelines.list.useQuery();
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Select the first pipeline automatically if none is selected
  useEffect(() => {
    if (!activePipelineId && pipelines && pipelines.length > 0) {
      setActivePipelineId(pipelines[0].id.toString());
    }
  }, [activePipelineId, pipelines]);

  const { data: opportunities, isLoading: loadingOpps } = trpc.opportunities.list.useQuery(
    { pipelineId: activePipelineId ? parseInt(activePipelineId) : undefined },
    { enabled: !!activePipelineId }
  );

  const moveMutation = trpc.opportunities.moveToStage.useMutation();
  const utils = trpc.useUtils();

  const [activeId, setActiveId] = useState<number | null>(null);

  const activePipeline = pipelines?.find(p => p.id.toString() === activePipelineId);
  const stages = activePipeline?.stages || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const oppId = active.id as number;
    const overId = over.id;

    if (typeof overId === 'string' && overId.startsWith('stage-')) {
      const newStageId = parseInt(overId.replace('stage-', ''));
      const opp = opportunities?.find(o => o.id === oppId);
      
      if (opp && opp.stageId !== newStageId) {
        // Optimistic UI update
        const queryKeyArgs = activePipelineId ? { pipelineId: parseInt(activePipelineId) } : undefined;
        utils.opportunities.list.setData(queryKeyArgs, (old: any) => {
          if (!old) return old;
          return old.map((o: any) => o.id === oppId ? { ...o, stageId: newStageId } : o);
        });

        try {
          moveMutation.mutateAsync({ id: oppId, stageId: newStageId }).then(() => {
            utils.opportunities.list.invalidate();
            utils.opportunities.stats.invalidate();
          }).catch((e) => {
            console.error("Failed to move", e);
            utils.opportunities.list.invalidate();
          });
        } catch (e) {
          console.error("Failed to move", e);
        }
      }
    }
  };

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

      {/* Main Content Area */}
      {viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <OpportunityListView 
            opportunities={opportunities || []} 
            stages={stages} 
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-container">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex h-full gap-3 pb-4 items-start">
            {stages.map(stage => {
              const stageOpps = opportunities?.filter(o => o.stageId === stage.id) || [];
              const stageValue = stageOpps.reduce((sum, o) => sum + (Number(o.monetaryValue) || 0), 0);

              return (
                <div 
                  key={`stage-${stage.id}`} 
                  id={`stage-${stage.id}`}
                  className="flex-shrink-0 w-[280px] h-full flex flex-col bg-muted/50 rounded-xl border kanban-column"
                >
                  {/* Stage Header */}
                  <div className="px-3 py-2.5 border-b flex items-center justify-between kanban-column-header">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color || 'var(--muted-foreground)' }} />
                      <h3 className="font-semibold text-foreground text-[13px] truncate">{stage.name}</h3>
                      <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-md font-medium">
                        {stageOpps.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stage Value */}
                  {stageValue > 0 && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-primary tabular-nums border-b bg-card/50">
                      R$ {stageValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-2 min-h-[120px] custom-scrollbar" id={`stage-${stage.id}`}>
                    {loadingOpps ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : stageOpps.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                        Nenhum negócio
                      </div>
                    ) : (
                      stageOpps.map(opp => (
                        <div key={opp.id} id={opp.id.toString()}>
                           <SimpleOppCard opp={opp} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="drag-overlay-card">
                <SimpleOppCard opp={opportunities?.find(o => o.id === activeId)} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </div>
      )}
    </div>
  );
}
