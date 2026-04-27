import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { trpc } from '@/lib/trpc';
import { useKanbanTriggers } from '@/hooks/useKanbanTriggers';

interface KanbanBoardProps {
  leads: any[];
  stats: Record<string, number>;
}

export function KanbanBoard({ leads, stats }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { triggerTaskForStatus } = useKanbanTriggers();

  // Configurar sensores para drag (precisa arrastar 8px antes de ativar)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Mutation para atualizar status
  const updateStatusMutation = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      // Invalidar cache para recarregar dados
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      utils.leads.getUniqueSegments.invalidate();
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
    }
  });

  // Colunas fixas do pipeline
  const columns = [
    { id: 'Entrar em contato', label: 'Entrar em contato', color: 'bg-blue-500' },
    { id: 'Contatado', label: 'Contatado', color: 'bg-orange-500' },
    { id: 'Não Respondeu', label: 'Não Respondeu', color: 'bg-slate-500' },
    { id: 'Interessado', label: 'Interessado', color: 'bg-green-500' },
    { id: 'Não possui Interesse', label: 'Não possui Interesse', color: 'bg-muted' }
  ];

  // Filtrar leads por status
  const getLeadsByStatus = useCallback(
    (status: string) => {
      return leads.filter(l => l.status === status);
    },
    [leads]
  );

  // Handler para início do drag
  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

  // Handler para fim do drag (quando solta o card)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      // Extrair ID do lead e novo status
      const leadId = active.id as string;
      const newStatus = over.id as string;

      // Encontrar o lead para pegar o nome da empresa
      const lead = leads.find(l => String(l.id) === leadId);

      console.log('🔄 Movendo card:', { leadId, newStatus });

      // CRÍTICO: Usar requestAnimationFrame para permitir animação CSS
      requestAnimationFrame(() => {
        // Chamar mutation para atualizar status no backend
        updateStatusMutation.mutate({ 
          leadId: parseInt(leadId), 
          status: newStatus 
        });

        // ⚡ Gatilho automático: criar tarefa se houver regra para a coluna de destino
        if (lead) {
          triggerTaskForStatus(lead.id, lead.companyName, newStatus);
        }
      });
    },
    [updateStatusMutation, leads, triggerTaskForStatus]
  );

  // Card ativo (para DragOverlay)
  const activeCard = activeId 
    ? leads.find(l => String(l.id) === activeId) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-container flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnLeads = getLeadsByStatus(column.id);
          
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              count={columnLeads.length}
              leads={columnLeads}
            />
          );
        })}
      </div>

      {/* DragOverlay: Cópia visual do card durante drag */}
      <DragOverlay dropAnimation={null}>
        {activeCard && (
          <div 
            className="opacity-50 rotate-3 scale-105"
            style={{
              transformOrigin: '0 0',
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <KanbanCard lead={activeCard} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
