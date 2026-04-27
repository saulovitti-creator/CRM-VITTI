import { useState, useCallback, useRef } from "react";
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

interface KanbanBoardProps {
  stages: Array<{ id: number; name: string; color?: string | null }>;
  opportunities: any[] | undefined;
  isLoading: boolean;
  pipelineId: string;
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
export function KanbanBoard({ stages, opportunities, isLoading, pipelineId }: KanbanBoardProps) {
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
      activationConstraint: { distance: 5 },
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

  // --- Event Handlers ---

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as number;
    setActiveId(id);
    setErrorCardId(null);

    const opp = opportunities?.find((o) => o.id === id);
    if (opp) {
      setLiveMessage(`Arrastando oportunidade: ${opp.title}`);
    }
  }, [opportunities]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = String(over.id);
      // Track which column is being hovered
      if (overId.startsWith("stage-")) {
        setActiveOverId(overId);
      } else {
        // Card is being hovered — find its parent column
        const overOpp = opportunities?.find((o) => o.id === over.id);
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

    // Reset visual states
    setActiveId(null);
    setActiveOverId(null);

    if (!over || !opportunities) return;

    const oppId = active.id as number;
    const overId = String(over.id);

    // Determine target stage ID
    let newStageId: number | null = null;

    if (overId.startsWith("stage-")) {
      newStageId = parseInt(overId.replace("stage-", ""));
    } else {
      // Dropped on another card — use that card's stage
      const overOpp = opportunities.find((o) => o.id === over.id);
      if (overOpp) {
        newStageId = overOpp.stageId;
      }
    }

    if (newStageId === null) return;

    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.stageId === newStageId) return;

    // --- Optimistic Update with Snapshot ---
    const queryKeyArgs = pipelineId ? { pipelineId: parseInt(pipelineId) } : undefined;

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
        utils.opportunities.list.invalidate();
        utils.opportunities.stats.invalidate();
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
    setActiveId(null);
    setActiveOverId(null);
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
        <div className="flex h-full gap-3 pb-4 items-start">
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
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {activeOpp ? (
            <KanbanCard opp={activeOpp} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
