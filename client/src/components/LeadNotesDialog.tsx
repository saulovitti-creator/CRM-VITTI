import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LeadNotesDialogProps {
  leadId: number;
  companyName: string;
}

export function LeadNotesDialog({ leadId, companyName }: LeadNotesDialogProps) {
  const [open, setOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const notesQuery = trpc.leads.notes.list.useQuery({ leadId });
  const createNoteMutation = trpc.leads.notes.create.useMutation();
  const deleteNoteMutation = trpc.leads.notes.delete.useMutation();
  const utils = trpc.useUtils();

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Nota não pode estar vazia");
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        leadId,
        content: noteContent,
      });
      setNoteContent("");
      await utils.leads.notes.list.invalidate({ leadId });
      toast.success("Nota adicionada com sucesso!");
    } catch (error) {
      toast.error("Erro ao adicionar nota");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNoteMutation.mutateAsync({ id: noteId });
      await utils.leads.notes.list.invalidate({ leadId });
      toast.success("Nota deletada com sucesso!");
    } catch (error) {
      toast.error("Erro ao deletar nota");
    }
  };

  const notes = notesQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageSquare className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notas - {companyName}</DialogTitle>
          <DialogDescription>
            Adicione e gerencie notas sobre este prospecto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Note Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova Nota</label>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Digite uma nota..."
              rows={3}
            />
            <Button
              onClick={handleAddNote}
              disabled={createNoteMutation.isPending}
              className="w-full"
            >
              {createNoteMutation.isPending ? "Adicionando..." : "Adicionar Nota"}
            </Button>
          </div>

          {/* Notes List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas Anteriores</label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {notesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando notas...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma nota adicionada</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-muted/50 p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground flex-1">{note.content}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deleteNoteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
