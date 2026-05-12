import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building, GripVertical, Trash2 } from "lucide-react";
import { OpportunityFormDialog } from "../OpportunityFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// --- Temporary DnD debug helper (activate: localStorage.setItem("DEBUG_DND","true")) ---
const dndDebug = (...args: unknown[]) => {
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_DND") === "true") {
    console.log("[DND DEBUG][KanbanCard]", ...args);
  }
};

interface KanbanCardProps {
  opp: any;
  isOverlay?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

/**
 * KanbanCard — Enterprise-grade draggable opportunity card.
 *
 * States:
 *  - idle: default resting state
 *  - hover: subtle elevation on mouse over
 *  - dragging: ghost/placeholder left behind (reduced opacity, dashed border)
 *  - overlay: the floating card following the cursor (elevated, rotated, primary border)
 *  - loading: subtle pulse while backend confirms
 *  - error: brief red flash on rollback
 */
export function KanbanCard({ opp, isOverlay = false, isLoading = false, hasError = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(opp.id),
    data: { type: "card", opp },
    disabled: isOverlay,
  });

  const deleteMutation = trpc.opportunities.delete.useMutation();
  const utils = trpc.useUtils();

  // Build dynamic styles from useSortable
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease",
  };

  // --- State-driven class composition ---
  const cardClasses = [
    "kanban-card bg-card p-3 rounded-[10px] border group relative",
    // Overlay (floating card)
    isOverlay && "kanban-card-overlay",
    // Ghost/placeholder left behind
    isDragging && !isOverlay && "kanban-card-ghost",
    // Loading pulse
    isLoading && "kanban-card-loading",
    // Error flash
    hasError && "kanban-card-error",
    // Default idle + hover
    !isDragging && !isOverlay && !isLoading && !hasError && "kanban-card-idle",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: "none" }}
      className={`${cardClasses} select-none cursor-grab active:cursor-grabbing`}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="Cartão arrastável"
      aria-label={`Oportunidade: ${opp.title}`}
      onPointerDownCapture={(event) => {
        dndDebug("root pointerdown capture", {
          opportunityId: opp.id,
          typeOfId: typeof opp.id,
          sortableId: String(opp.id),
          pointerType: event.pointerType,
          button: event.button,
          isPrimary: event.isPrimary,
          targetTag: (event.target as HTMLElement)?.tagName,
          currentTargetTag: (event.currentTarget as HTMLElement)?.tagName,
          listenersKeys: listeners ? Object.keys(listeners) : "NO_LISTENERS",
          attributesKeys: attributes ? Object.keys(attributes) : "NO_ATTRIBUTES",
        });
      }}
    >
      {/* Title + Delete */}
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0">
          {!isOverlay && (
            <div className="mt-0.5 rounded p-0.5 text-muted-foreground/70">
              <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
            </div>
          )}
          <h4 className="text-card-title leading-snug pr-2 min-w-0">{opp.title}</h4>
        </div>

        {/* Delete — only visible on hover, not during drag */}
        {!isDragging && !isOverlay && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
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
                      utils.opportunities.closedList.invalidate();
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
        )}
      </div>

      {/* Company */}
      <div className="flex items-center text-xs text-muted-foreground mb-2">
        <Building className="w-3 h-3 mr-1.5 shrink-0" />
        <span className="truncate">
          {opp.contactName} {opp.contactCompany ? `(${opp.contactCompany})` : ""}
        </span>
      </div>

      {/* Monetary Value */}
      {opp.monetaryValue !== null && opp.monetaryValue !== undefined && opp.monetaryValue !== "" && (
        <div className="text-sm font-semibold text-primary tabular-nums">
          R$ {Number(opp.monetaryValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}

      {/* Edit — only visible on hover, not during drag */}
      {!isDragging && !isOverlay && (
        <div className="mt-2.5 flex justify-end">
          <OpportunityFormDialog
            opportunity={opp}
            trigger={
              <span
                className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                Editar
              </span>
            }
          />
        </div>
      )}
    </div>
  );
}
