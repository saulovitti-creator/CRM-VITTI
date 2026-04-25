import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import CreateColumnForm from './CreateColumnForm';
import DeleteColumnModal from './DeleteColumnModal';

interface ColumnManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ColumnManagementModal({ isOpen, onClose }: ColumnManagementModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: columns, isLoading, refetch } = trpc.columns.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const reorderMutation = trpc.columns.reorder.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Não foi possível reordenar as colunas.');
    },
  });

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
  };

  const handleMoveUp = (index: number) => {
    if (!columns || index === 0) return;
    const newOrder = [...columns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    reorderMutation.mutate({ columnIds: newOrder.map((c) => c.id) });
  };

  const handleMoveDown = (index: number) => {
    if (!columns || index === columns.length - 1) return;
    const newOrder = [...columns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate({ columnIds: newOrder.map((c) => c.id) });
  };

  const filteredColumns = columns?.filter(
    (col) =>
      col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showCreateForm || editingId) {
    return (
      <CreateColumnForm
        columnId={editingId}
        onSuccess={() => {
          setShowCreateForm(false);
          setEditingId(null);
          refetch();
        }}
        onCancel={() => {
          setShowCreateForm(false);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400">
            Gerenciar Colunas do Kanban
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Create Button */}
          <div className="flex gap-2">
            <Input
              placeholder="Buscar colunas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
            />
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova Coluna
            </Button>
          </div>

          {/* Columns List */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Carregando colunas...</div>
          ) : filteredColumns && filteredColumns.length > 0 ? (
            <div className="space-y-3">
              {filteredColumns.map((column, index) => (
                <div
                  key={column.id}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all group"
                >
                  {/* Main Row */}
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section: Badge + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Color Badge */}
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 mt-1 border border-slate-600"
                        style={{ backgroundColor: column.color || '#3b82f6' }}
                        title={column.color || '#3b82f6'}
                      />

                      {/* Column Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-base leading-tight">
                          {column.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-slate-400 text-sm">
                          <BarChart3 className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {column.leadCount === 0
                              ? 'Nenhum lead'
                              : `${column.leadCount} lead${column.leadCount !== 1 ? 's' : ''} nesta coluna`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === (filteredColumns?.length ?? 0) - 1}
                          className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                        </button>
                      </div>

                      {/* Edit Button */}
                      <Button
                        onClick={() => setEditingId(column.id)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                        title="Editar coluna"
                      >
                        <Edit2 className="w-5 h-5" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        onClick={() => handleDeleteClick(column.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Deletar coluna"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              {searchTerm ? 'Nenhuma coluna encontrada' : 'Nenhuma coluna criada ainda'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-900"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>

      {/* Delete Column Modal */}
      {deletingId && columns && (
        <DeleteColumnModal
          isOpen={true}
          columnId={deletingId}
          columnName={columns.find((c) => c.id === deletingId)?.name || ''}
          leadCount={columns.find((c) => c.id === deletingId)?.leadCount || 0}
          availableColumns={columns.map((c) => ({ id: c.id, name: c.name }))}
          onSuccess={() => {
            setDeletingId(null);
            refetch();
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </Dialog>
  );
}
