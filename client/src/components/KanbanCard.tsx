import { useDraggable } from '@dnd-kit/core';
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare } from "lucide-react";
import { getSegmentIcon, getSegmentColor } from "@shared/segment-icons";
import { useState } from 'react';
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { TagBadge } from "@/components/TagBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { useTasks } from "@/hooks/useTasks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KanbanCardProps {
  lead: any;
  isDragging?: boolean;
}

export function KanbanCard({ lead, isDragging = false }: KanbanCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { getPendingCountByProspect } = useTasks();
  const pendingTasksCount = getPendingCountByProspect(lead.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isDraggingState,
  } = useDraggable({ id: String(lead.id) });

  // Converter dados do lead para o formato esperado pelo modal
  const leadDetails = {
    id: lead.id,
    company_name: lead.companyName,
    contact_name: lead.contactName,
    phone: lead.phone,
    email: lead.email || "",
    segment: lead.segment,
    status: lead.status,
    city: lead.city || "",
    site: lead.site || "",
    implementationValue: lead.implementationValue,
    recurringValue: lead.recurringValue,
    notes: lead.notes || "",
    type: lead.type || "CRM",
    createdAt: lead.createdAt || new Date(),
    updatedAt: lead.updatedAt || new Date(),
    tags: lead.tags || [],
  };

  // Estilo inline com transições CSS
  const style = {
    // Transição suave ao soltar
    transition: isDraggingState
      ? 'none' // Sem transição durante drag (resposta imediata)
      : 'transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 200ms ease, box-shadow 200ms ease',
    
    // Feedback visual durante drag
    opacity: isDraggingState ? 0.6 : 1,
    
    // Z-index para card arrastado ficar acima
    zIndex: isDraggingState ? 1000 : 1,
    
    // Otimização GPU
    willChange: isDraggingState ? 'transform' : 'auto',
  };

  // Lógica do Termômetro de Contato (Semáforo do WhatsApp)
  let isCold = false;
  if (!lead.lastContactAt) {
    isCold = true;
  } else {
    const hoursSinceContact = (new Date().getTime() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceContact > 48) {
      isCold = true;
    }
  }

  const baseBorderClass = isCold 
    ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
    : "border-slate-600 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          bg-slate-700 rounded-lg p-4 cursor-grab active:cursor-grabbing border
          transition-colors duration-200
          ${baseBorderClass}
          ${isDraggingState ? 'shadow-2xl shadow-cyan-500/30 scale-105 rotate-2' : ''}
        `}
        onClick={() => setDetailsOpen(true)}
      >
        {/* Segment Icon + Company Name */}
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const SegmentIcon = getSegmentIcon(lead.segment);
            const segmentColor = getSegmentColor(lead.segment);
            return <SegmentIcon className={`w-5 h-5 flex-shrink-0 ${segmentColor}`} />;
          })()}
          <h3 className="font-semibold text-slate-100 truncate flex-1">{lead.companyName}</h3>
        </div>

        {/* Contact and Phone */}
        <div className="space-y-1 mb-3 text-sm">
          {lead.contactName && (
            <p className="text-slate-400 truncate">
              <span className="text-slate-500">Contato:</span> {lead.contactName}
            </p>
          )}
          {lead.phone && (
            <p className="text-slate-400 truncate">
              <span className="text-slate-500">Tel:</span> {lead.phone}
            </p>
          )}
        </div>

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {lead.tags.slice(0, 3).map((tag: any) => (
              <TagBadge key={tag.id} tag={tag} className="text-[10px] px-1.5 py-0" />
            ))}
            {lead.tags.length > 3 && (
              <span className="text-[10px] text-slate-400 self-center">+{lead.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Date Badge and Tasks */}
        <div className="mb-3 flex items-center gap-2">
          {lead.dataCriacao && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-600/50 text-slate-300 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {(() => {
                      const data = new Date(lead.dataCriacao);
                      const hoje = new Date();
                      const dias = Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
                      return dias === 0 ? "Hoje" : `há ${dias}d`;
                    })()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent></TooltipContent>
            </Tooltip>
          )}
          {pendingTasksCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                  <CheckSquare className="w-3 h-3" />
                  <span>{pendingTasksCount} tarefa{pendingTasksCount > 1 ? 's' : ''}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Este prospecto possui {pendingTasksCount} tarefa{pendingTasksCount > 1 ? 's' : ''} pendente{pendingTasksCount > 1 ? 's' : ''}.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Values */}
        <div className="space-y-1 text-sm">
          {lead.implementationValue && (
            <p className="text-green-400">
              Impl: <span className="font-semibold">{lead.implementationValue}</span>
            </p>
          )}
          {lead.recurringValue && (
            <p className="text-blue-400">
              Rec: <span className="font-semibold">{lead.recurringValue}</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-600/50">
          <LeadFormDialog lead={lead} />
          <DeleteLeadDialog leadId={lead.id} companyName={lead.companyName} />
          <WhatsAppButton phone={lead.phone} leadId={lead.id} />
        </div>
      </div>

      {/* Modals */}
      <LeadDetailsModal
        lead={leadDetails}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}
