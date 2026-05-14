import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Building, GripVertical, SearchX } from "lucide-react";

// --- Temporary DnD debug helper (activate: localStorage.setItem("DEBUG_DND","true")) ---
const dndDebug = (...args: unknown[]) => {
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_DND") === "true") {
    console.log("[DND DEBUG][KanbanBoard]", ...args);
  }
};

interface KanbanBoardProps {
  stages: Array<{ id: number; name: string; color?: string | null }>;
  opportunities: any[] | undefined;
  isLoading: boolean;
  pipelineId: string;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

function KanbanCardOverlay({ opp }: { opp: any }) {
  return (
    <div
      className="kanban-card kanban-card-overlay bg-card p-3 rounded-[10px] border select-none"
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0">
          <div className="mt-0.5 rounded p-0.5 text-muted-foreground/70">
            <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
          </div>
          <h4 className="text-card-title leading-snug pr-2 min-w-0">{opp.title}</h4>
        </div>
      </div>

      <div className="flex items-center text-xs text-muted-foreground mb-2">
        <Building className="w-3 h-3 mr-1.5 shrink-0" />
        <span className="truncate">
          {opp.contactName} {opp.contactCompany ? `(${opp.contactCompany})` : ""}
        </span>
      </div>

      {opp.monetaryValue !== null && opp.monetaryValue !== undefined && opp.monetaryValue !== "" && (
        <div className="text-sm font-semibold text-primary tabular-nums">
          R$ {Number(opp.monetaryValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}

/**
 * KanbanBoard — Enterprise DnD orchestrator.
 *
 * Responsibilities:
 *  - DndContext with collision detection and sensors
 *  - DragOverlay with premium styled floating card
 *  - Optimistic update with snapshot-based rollback
 *  - Debounced mutation to prevent race conditions
 *  - Drop zone tracking (activeOverId) for column highlighting
 *  - ARIA live region for screen reader feedback
 */
export function KanbanBoard({ stages, opportunities, isLoading, pipelineId, isFiltered, onClearFilters }: KanbanBoardProps) {
  const moveMutation = trpc.opportunities.moveToStage.useMutation();
  const utils = trpc.useUtils();

  // --- DnD State ---
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeOverId, setActiveOverId] = useState<string | null>(null);
  const [loadingCardId, setLoadingCardId] = useState<number | null>(null);
  const [errorCardId, setErrorCardId] = useState<number | null>(null);

  // ARIA live region message
  const [liveMessage, setLiveMessage] = useState("");

  // Debounce: track in-flight mutation to prevent race conditions
  const inflightRef = useRef<AbortController | null>(null);

  // --- Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Measuring config for stable layout ---
  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  // --- Active card data ---
  const activeOpp = activeId
    ? opportunities?.find((o) => o.id === activeId)
    : null;

  useEffect(() => {
    dndDebug("state", { activeId, activeOverId, loadingCardId });
  }, [activeId, activeOverId, loadingCardId]);

  if (activeId && !activeOpp) {
    dndDebug("activeOpp NOT FOUND", { activeId, activeIdType: typeof activeId, opportunitiesCount: opportunities?.length, firstOppId: opportunities?.[0]?.id, firstOppIdType: typeof opportunities?.[0]?.id });
  }

  // --- Event Handlers ---

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = Number(event.active.id);
    dndDebug("handleDragStart", {
      rawActiveId: event.active.id,
      rawActiveIdType: typeof event.active.id,
      convertedId: id,
      activeData: event.active.data.current,
    });
    setActiveId(id);
    setErrorCardId(null);

    const opp = opportunities?.find((o) => o.id === id);
    if (opp) {
      setLiveMessage(`Arrastando oportunidade: ${opp.title}`);
    }
  }, [opportunities]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    dndDebug("handleDragOver", {
      activeId: event.active.id,
      overId: over?.id,
      overIdType: typeof over?.id,
    });
    if (over) {
      const overId = String(over.id);
      // Track which column is being hovered
      if (overId.startsWith("stage-")) {
        setActiveOverId(overId);
      } else {
        // Card is being hovered — find its parent column
        const overOpp = opportunities?.find((o) => String(o.id) === String(over.id));
        if (overOpp) {
          setActiveOverId(`stage-${overOpp.stageId}`);
        }
      }
    } else {
      setActiveOverId(null);
    }
  }, [opportunities]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    dndDebug("handleDragEnd", {
      active: active?.id,
      over: over?.id,
    });

    // Reset visual states
    setActiveId(null);
    setActiveOverId(null);

    if (!over || !opportunities) {
      dndDebug("drag ended without valid over", { activeId: event.active.id, hasOver: !!over, hasOpps: !!opportunities });
      return;
    }

    const oppId = Number(active.id);
    const overId = String(over.id);

    // Determine target stage ID
    let newStageId: number | null = null;

    if (overId.startsWith("stage-")) {
      newStageId = parseInt(overId.replace("stage-", ""));
    } else {
      // Dropped on another card — use that card's stage
      const overOpp = opportunities.find((o) => String(o.id) === String(over.id));
      if (overOpp) {
        newStageId = overOpp.stageId;
      }
    }

    if (newStageId === null) return;

    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.stageId === newStageId) return;

    // --- Optimistic Update with Snapshot ---
    const queryKeyArgs = pipelineId ? { pipelineId: parseInt(pipelineId), status: "open" as const } : undefined;

    // 1. Take snapshot for rollback
    const previousData = utils.opportunities.list.getData(queryKeyArgs);

    // 2. Apply optimistic update
    utils.opportunities.list.setData(queryKeyArgs, (old: any) => {
      if (!old) return old;
      return old.map((o: any) =>
        o.id === oppId ? { ...o, stageId: newStageId } : o
      );
    });

    setLoadingCardId(oppId);
    const targetStage = stages.find((s) => s.id === newStageId);
    setLiveMessage(`Oportunidade ${opp.title} movida para ${targetStage?.name || "nova coluna"}`);

    // 3. Cancel previous in-flight mutation (debounce)
    if (inflightRef.current) {
      inflightRef.current.abort();
    }
    const controller = new AbortController();
    inflightRef.current = controller;

    try {
      // 4. Persist to backend
      await moveMutation.mutateAsync(
        { id: oppId, stageId: newStageId },
      );

      // 5. Success — sync with server data
      if (!controller.signal.aborted) {
        setLoadingCardId(null);
        // Silently refresh to ensure consistency
        if (queryKeyArgs) {
          utils.opportunities.list.invalidate(queryKeyArgs);
        }
        utils.opportunities.list.invalidate();
        utils.opportunities.closedList.invalidate();
        utils.opportunities.stats.invalidate();
        utils.dashboard.stats.invalidate();
        utils.dashboard.followUpAlerts.invalidate();
      }
    } catch (error: any) {
      if (controller.signal.aborted) return;

      console.error("[KanbanBoard] Move failed, rolling back:", error);

      // 6. ROLLBACK — restore snapshot
      if (previousData) {
        utils.opportunities.list.setData(queryKeyArgs, previousData);
      } else {
        utils.opportunities.list.invalidate();
      }

      // 7. Error flash on card
      setLoadingCardId(null);
      setErrorCardId(oppId);
      setTimeout(() => setErrorCardId(null), 1500);

      // 8. User feedback
      toast.error("Falha ao mover oportunidade. A alteração foi revertida.", {
        description: error?.message || "Tente novamente em alguns instantes.",
      });
      setLiveMessage(`Erro ao mover oportunidade ${opp.title}. Alteração revertida.`);
    } finally {
      if (inflightRef.current === controller) {
        inflightRef.current = null;
      }
    }
  }, [opportunities, pipelineId, stages, moveMutation, utils]);

  const handleDragCancel = useCallback(() => {
    dndDebug("handleDragCancel");
    setActiveId(null);
    setActiveOverId(null);
    setLoadingCardId(null);
    setLiveMessage("Arraste cancelado");
  }, []);

  return (
    <>
      {/* ARIA Live Region — invisible, announced by screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={measuring}
      >
        <div className="flex h-full gap-3 pb-4 items-start relative min-h-[300px]">
          {isFiltered && opportunities?.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px] rounded-xl border border-dashed m-1">
              <SearchX className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium mb-4">Nenhuma oportunidade aberta encontrada com os filtros aplicados.</p>
              <Button variant="outline" onClick={onClearFilters}>Limpar Filtros</Button>
            </div>
          )}
          {stages.map((stage) => {
            const stageOpps = opportunities?.filter((o) => o.stageId === stage.id) || [];

            return (
              <KanbanColumn
                key={`stage-${stage.id}`}
                stage={stage}
                opportunities={stageOpps}
                isLoading={isLoading}
                loadingCardId={loadingCardId}
                errorCardId={errorCardId}
              />
            );
          })}
        </div>

        {/* DragOverlay — the floating card that follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeId !== null && activeOpp ? (
            <KanbanCardOverlay opp={activeOpp} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
