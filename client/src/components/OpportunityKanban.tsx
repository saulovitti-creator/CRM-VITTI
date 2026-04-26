import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { Loader2, Kanban as KanbanIcon, Plus, Building } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
// we will inline a simple card or create it

// Inlined Opportunity Card for simplicity in this file
function SimpleOppCard({ opp }: { opp: any }) {
  return (
    <div className="bg-slate-800 p-3 rounded border border-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-600 mb-2">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-slate-200 text-sm">{opp.title}</h4>
      </div>
      <div className="flex items-center text-xs text-slate-400 mb-2">
        <Building className="w-3 h-3 mr-1" />
        {opp.contactName} {opp.contactCompany ? `(${opp.contactCompany})` : ""}
      </div>
      {opp.monetaryValue !== null && opp.monetaryValue !== undefined && opp.monetaryValue !== "" && (
        <div className="text-xs font-semibold text-emerald-400">
          R$ {Number(opp.monetaryValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}
      <div className="mt-2 text-right">
        <OpportunityFormDialog 
          opportunity={opp} 
          trigger={<span className="text-xs text-cyan-500 hover:underline cursor-pointer">Editar</span>} 
        />
      </div>
    </div>
  );
}

export function OpportunityKanban() {
  const { data: pipelines, isLoading: loadingPipes } = trpc.pipelines.list.useQuery();
  const [activePipelineId, setActivePipelineId] = useState<string>("");

  // Select the first pipeline automatically if none is selected
  if (!activePipelineId && pipelines && pipelines.length > 0) {
    setActivePipelineId(pipelines[0].id.toString());
  }

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
    const overId = over.id; // Could be a stageId or another oppId

    // Very simplified drag and drop: 
    // If we dropped over a stage container (whose ID we will prefix with 'stage-')
    if (typeof overId === 'string' && overId.startsWith('stage-')) {
      const newStageId = parseInt(overId.replace('stage-', ''));
      const opp = opportunities?.find(o => o.id === oppId);
      
      if (opp && opp.stageId !== newStageId) {
        // Optimistic UI update could go here
        try {
          await moveMutation.mutateAsync({ id: oppId, stageId: newStageId });
          await utils.opportunities.list.invalidate();
          await utils.opportunities.stats.invalidate();
        } catch (e) {
          console.error("Failed to move", e);
        }
      }
    }
  };

  if (loadingPipes) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <KanbanIcon className="w-5 h-5 text-slate-400" />
          <Select value={activePipelineId} onValueChange={setActivePipelineId}>
            <SelectTrigger className="w-[250px] bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Selecione um Funil..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              {pipelines?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <OpportunityFormDialog defaultPipelineId={parseInt(activePipelineId)} />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex h-full gap-4 pb-4 items-start">
            {stages.map(stage => {
              const stageOpps = opportunities?.filter(o => o.stageId === stage.id) || [];
              const stageValue = stageOpps.reduce((sum, o) => sum + (Number(o.monetaryValue) || 0), 0);

              return (
                <div 
                  key={`stage-${stage.id}`} 
                  id={`stage-${stage.id}`}
                  className="flex-shrink-0 w-[300px] h-full flex flex-col bg-slate-900/50 rounded-xl border border-slate-800"
                >
                  {/* Stage Header */}
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#475569' }} />
                      <h3 className="font-semibold text-slate-200 truncate">{stage.name}</h3>
                      <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                        {stageOpps.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stage Value */}
                  {stageValue > 0 && (
                    <div className="px-3 py-1 bg-slate-800/30 text-xs text-slate-400 border-b border-slate-800">
                      R$ {stageValue.toLocaleString('pt-BR')}
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-2 min-h-[150px]" id={`stage-${stage.id}`}>
                    {loadingOpps ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-slate-600" /></div>
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
              <SimpleOppCard opp={opportunities?.find(o => o.id === activeId)} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
