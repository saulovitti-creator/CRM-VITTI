import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DeleteColumnModalProps {
  isOpen: boolean;
  columnId: number;
  columnName: string;
  leadCount: number;
  availableColumns: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DeleteColumnModal({
  isOpen,
  columnId,
  columnName,
  leadCount,
  availableColumns,
  onSuccess,
  onCancel,
}: DeleteColumnModalProps) {
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Fetch leads in this column
  const { data: leadsInColumn = [] } = trpc.columns.getLeadsInColumn.useQuery(
    { columnName },
    { enabled: isOpen && leadCount > 0 }
  );

  const deleteColumnMutation = trpc.columns.delete.useMutation({
    onSuccess: () => {
      toast.success(`✅ Coluna "${columnName}" excluída com sucesso!`);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao deletar coluna');
    },
  });

  const moveLeadsMutation = trpc.columns.moveLeads.useMutation({
    onSuccess: () => {
      deleteColumnMutation.mutate({ id: columnId });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao mover leads');
    },
  });

  const handleDelete = () => {
    if (leadCount === 0) {
      // Coluna vazia - deletar direto
      deleteColumnMutation.mutate({ id: columnId });
    } else {
      // Coluna com leads - validar seleção
      if (!selectedDestinationId) {
        toast.error('Selecione uma coluna de destino');
        return;
      }

      if (!confirmChecked) {
        toast.error('Confirme que deseja mover os leads e excluir a coluna');
        return;
      }

      const destinationColumn = availableColumns.find((c) => c.id === parseInt(selectedDestinationId));
      if (!destinationColumn) {
        toast.error('Coluna de destino inválida');
        return;
      }

      moveLeadsMutation.mutate({
        fromColumnName: columnName,
        toColumnName: destinationColumn.name,
      });
    }
  };

  const isLoading = deleteColumnMutation.isPending || moveLeadsMutation.isPending;
  const destinationOptions = availableColumns.filter((c) => c.id !== columnId);
  const isFormValid = leadCount === 0 || (selectedDestinationId && confirmChecked);

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-500">
            <AlertTriangle className="w-6 h-6" />
            {leadCount === 0 ? 'Deletar Coluna' : 'Atenção: Coluna Contém Leads!'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {leadCount === 0
              ? `Tem certeza que deseja deletar a coluna "${columnName}"?`
              : `A coluna "${columnName}" possui ${leadCount} lead${leadCount !== 1 ? 's' : ''} e não pode ser excluída diretamente.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Box */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-300">
              <strong>⚠️ Aviso:</strong> Esta ação não pode ser desfeita.
            </p>
          </div>

          {/* Empty Column Case */}
          {leadCount === 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-300">
                ✅ Esta coluna está vazia e será deletada imediatamente.
              </p>
            </div>
          )}

          {/* Column with Leads Case */}
          {leadCount > 0 && (
            <>
              {/* Leads List */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Leads nesta coluna ({leadCount}):
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {leadsInColumn.slice(0, 5).map((lead: any) => (
                    <div key={lead.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                      <span>•</span>
                      <span className="truncate">{lead.company_name || lead.contact_name || 'Sem nome'}</span>
                    </div>
                  ))}
                  {leadsInColumn.length > 5 && (
                    <div className="text-xs text-muted-foreground pl-6">
                      ... e mais {leadsInColumn.length - 5} lead{leadsInColumn.length - 5 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Selection */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Mover todos os leads para: <span className="text-red-400">*</span>
                </label>
                <Select value={selectedDestinationId} onValueChange={setSelectedDestinationId}>
                  <SelectTrigger className="bg-muted border-border text-white">
                    <SelectValue placeholder="Selecione uma coluna..." />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {destinationOptions.length > 0 ? (
                      destinationOptions.map((col) => (
                        <SelectItem key={col.id} value={col.id.toString()}>
                          {col.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma coluna disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                  className="mt-1"
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm text-foreground cursor-pointer flex-1"
                >
                  ☑️ Confirmo que desejo mover <strong>{leadCount}</strong> lead
                  {leadCount !== 1 ? 's' : ''} e excluir esta coluna
                </label>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-border text-foreground hover:bg-card"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !isFormValid}
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? 'Processando...' : leadCount === 0 ? 'Excluir Coluna' : 'Mover e Excluir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
