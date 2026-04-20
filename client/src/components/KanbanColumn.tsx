import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import { useTasks } from '@/hooks/useTasks';
import { CheckSquare } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  leads: any[];
}

export function KanbanColumn({ id, label, color, count, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { getPendingCountByProspect } = useTasks();

  const columnPendingTasks = leads.reduce((acc, lead) => acc + getPendingCountByProspect(lead.id), 0);

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-w-[320px] max-w-[320px] bg-slate-800/50 rounded-lg p-4 transition-all ${
        isOver ? 'ring-2 ring-cyan-400 bg-slate-700/70' : ''
      }`}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-semibold text-white">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {columnPendingTasks > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20" title={`${columnPendingTasks} tarefas pendentes nesta coluna`}>
              <CheckSquare className="w-3 h-3" />
              {columnPendingTasks}
            </span>
          )}
          <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded">
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>

      {/* Placeholder quando vazio */}
      {leads.length === 0 && (
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-700 rounded-lg text-slate-500">
          Nenhum lead
        </div>
      )}
    </div>
  );
}
