import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Tag } from "@shared/types";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { TagBadge } from "./TagBadge";

interface TagManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e", 
  "#64748b", "#cbd5e1"
];

export function TagManagementModal({ open, onOpenChange }: TagManagementModalProps) {
  const utils = trpc.useUtils();
  const { data: tags = [], isLoading } = trpc.tags.list.useQuery(undefined, {
    enabled: open,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[6]); // default blue

  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      toast.success("Tag criada com sucesso");
      setIsCreating(false);
      setNewName("");
      utils.tags.list.invalidate();
    },
    onError: (e) => {
      toast.error(`Erro ao criar tag: ${e.message}`);
    }
  });

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      toast.success("Tag atualizada");
      setEditingId(null);
      utils.tags.list.invalidate();
    },
    onError: (e) => {
      toast.error(`Erro ao atualizar: ${e.message}`);
    }
  });

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      toast.success("Tag removida de todos os leads");
      utils.tags.list.invalidate();
    },
    onError: (e) => {
      toast.error(`Erro ao remover: ${e.message}`);
    }
  });

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error("O nome não pode ser vazio");
      return;
    }
    updateMutation.mutate({ id: editingId!, name: editName, color: editColor });
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("O nome não pode ser vazio");
      return;
    }
    createMutation.mutate({ name: newName, color: newColor });
  };

  const handleDelete = (id: number) => {
    if (confirm("ATENÇÃO: Isso removerá esta tag de TODOS os leads que a possuem. Deseja continuar?")) {
      deleteMutation.mutate({ id });
    }
  };

  const ColorPicker = ({ selected, onChange }: { selected: string, onChange: (c: string) => void }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center border-2 ${selected === color ? 'border-white' : 'border-transparent'}`}
          style={{ backgroundColor: color }}
        >
          {selected === color && <Check className="h-3 w-3 text-white drop-shadow-md" />}
        </button>
      ))}
      <div className="relative overflow-hidden w-6 h-6 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center cursor-pointer">
        <input 
          type="color" 
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-10px] w-12 h-12 cursor-pointer opacity-0"
        />
        <Plus className="h-3 w-3 text-slate-400" />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-cyan-500/30 text-slate-200 max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Gerenciar Tags</DialogTitle>
          <DialogDescription className="text-slate-400">
            Crie, edite ou remova tags do sistema. Removê-las afetará todos os leads.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-4 space-y-4">
          {/* Create New Section */}
          {!isCreating ? (
            <Button 
              variant="outline" 
              className="w-full border-dashed border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/20 text-cyan-400"
              onClick={() => { setIsCreating(true); setEditingId(null); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          ) : (
            <div className="bg-slate-800/80 p-4 rounded-lg border border-cyan-500/30 space-y-3">
              <div>
                <Label>Nome da Tag</Label>
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-900 border-slate-700 mt-1"
                  placeholder="Ex: VIP, Google Ads..."
                  autoFocus
                />
              </div>
              <div>
                <Label>Cor</Label>
                <ColorPicker selected={newColor} onChange={setNewColor} />
              </div>
              <div className="pt-2">
                <Label className="text-xs text-slate-400 mb-1 block">Preview</Label>
                <TagBadge tag={{ id: 0, name: newName || "Preview", color: newColor, createdAt: new Date() } as Tag} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !newName.trim()}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          {/* List Section */}
          <div className="space-y-2 mt-6">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Tags Existentes</h4>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
            ) : tags.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">Nenhuma tag cadastrada.</p>
            ) : (
              tags.map(tag => (
                <div key={tag.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  {editingId === tag.id ? (
                    <div className="space-y-3">
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                      <ColorPicker selected={editColor} onChange={setEditColor} />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancelar</Button>
                        <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending || !editName.trim()}>
                          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <TagBadge tag={tag} />
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-slate-800" onClick={() => startEdit(tag)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-800" onClick={() => handleDelete(tag.id)}>
                          {deleteMutation.isPending && deleteMutation.variables?.id === tag.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
