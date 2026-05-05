import { trpc } from "@/lib/trpc";
import { MessageCircle, Bot, Loader2, Trash2 } from "lucide-react";

interface TimelineNotesProps {
  opportunityId: number;
}

export function TimelineNotes({ opportunityId }: TimelineNotesProps) {
  const notesQuery = trpc.opportunities.getNotes.useQuery({ opportunityId });
  const deleteNoteMutation = trpc.opportunities.deleteNote.useMutation({
    onSuccess: () => notesQuery.refetch(),
  });
  const notes = notesQuery.data || [];

  if (notesQuery.isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (notes.length === 0) {
    return <p className="text-muted-foreground text-xs text-center py-3">Nenhuma interação registrada ainda.</p>;
  }

  return (
    <div className="space-y-0 mt-3 max-h-64 overflow-y-auto pr-1">
      {notes.map((note: any) => {
        const isSystem = note.noteType === "system" || note.noteType === "whatsapp";
        const date = new Date(note.createdAt);
        const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={note.id} className="flex gap-3 group relative">
            {/* Vertical line */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                isSystem
                  ? "bg-amber-500/60 border-2 border-amber-400/40"
                  : "bg-primary/60 border-2 border-primary/40"
              }`} />
              <div className="w-px flex-1 bg-muted/50 min-h-[16px]" />
            </div>

            {/* Content */}
            <div className={`flex-1 pb-4 ${isSystem ? "" : ""}`}>
              <div className="flex items-center gap-2 mb-0.5">
                {isSystem ? (
                  <Bot className="w-3 h-3 text-amber-400" />
                ) : (
                  <MessageCircle className="w-3 h-3 text-primary" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isSystem ? "text-amber-400" : "text-primary"
                }`}>
                  {isSystem ? "Sistema" : "Usuário"}
                </span>
                <span className="text-[10px] text-muted-foreground">{formattedDate} às {formattedTime}</span>
                {/* Delete button */}
                {!isSystem && (
                  <button
                    onClick={() => deleteNoteMutation.mutate({ id: note.id })}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    title="Excluir nota"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${
                isSystem ? "text-amber-200/80 italic" : "text-foreground"
              }`}>
                {note.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
