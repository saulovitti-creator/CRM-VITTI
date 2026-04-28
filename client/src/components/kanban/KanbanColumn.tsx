import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { Loader2 } from "lucide-react";

interface KanbanColumnProps {
  stage: {
    id: number;
    name: string;
    color?: string | null;
  };
  opportunities: any[];
  isLoading: boolean;
  /** ID of the card currently being processed by backend */
  loadingCardId?: number | null;
  /** ID of the card that failed and is being rolled back */
  errorCardId?: number | null;
}

/**
 * KanbanColumn — Enterprise droppable column.
 *
 * Uses `useDroppable` from @dnd-kit/core to act as a valid drop zone.
 * Provides visual feedback when a card is being dragged over it:
 *  - Highlighted border (primary color)
 *  - Subtle background tint
 *  - Header color shift
 */
export function KanbanColumn({ stage, opportunities, isLoading, loadingCardId, errorCardId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: "column", stageId: stage.id },
  });

  const stageValue = opportunities.reduce(
    (sum, o) => sum + (Number(o.monetaryValue) || 0),
    0
  );

  const cardIds = opportunities.map((o) => o.id);

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-shrink-0 w-[280px] h-full flex flex-col rounded-xl border kanban-column",
        isOver ? "kanban-drop-zone-active" : "bg-slate-200/50 border-slate-300/60 dark:bg-muted/50 dark:border-border",
      ].join(" ")}
    >
      {/* Stage Header */}
      <div className={[
        "px-3 py-2.5 border-b border-slate-300/60 dark:border-border flex items-center justify-between kanban-column-header",
        isOver ? "kanban-column-header-active" : "",
      ].join(" ")}>
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color || 'var(--muted-foreground)' }}
          />
          <h3 className="font-semibold text-foreground text-[13px] truncate">{stage.name}</h3>
          <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-md font-medium">
            {opportunities.length}
          </span>
        </div>
      </div>

      {/* Stage Value */}
      {stageValue > 0 && (
        <div className="px-3 py-1.5 text-xs font-semibold text-primary tabular-nums border-b border-slate-300/60 dark:border-border bg-card/50">
          R$ {stageValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}

      {/* Cards Container */}
      <div
        className="flex-1 overflow-y-auto p-2 min-h-[120px] custom-scrollbar"
        role="list"
        aria-label={`Coluna: ${stage.name}`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className={[
              "flex items-center justify-center h-20 text-xs rounded-lg transition-colors duration-200",
              isOver
                ? "text-primary border-2 border-dashed border-primary/30 bg-primary/5"
                : "text-muted-foreground",
            ].join(" ")}>
              {isOver ? "Solte aqui" : "Nenhum negócio"}
            </div>
          ) : (
            <>
              {opportunities.map((opp) => (
                <KanbanCard
                  key={opp.id}
                  opp={opp}
                  isLoading={loadingCardId === opp.id}
                  hasError={errorCardId === opp.id}
                />
              ))}
              {/* Drop hint at bottom when column has cards */}
              {isOver && (
                <div className="h-16 border-2 border-dashed border-primary/30 rounded-[10px] bg-primary/5 flex items-center justify-center text-xs text-primary mt-1">
                  Solte aqui
                </div>
              )}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
