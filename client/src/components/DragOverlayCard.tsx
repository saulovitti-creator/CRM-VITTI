import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSegmentIcon, getSegmentColor } from "@shared/segment-icons";
import { CATEGORY_COLORS } from "@shared/types";

interface DragOverlayCardProps {
  lead: any;
}

export function DragOverlayCard({ lead }: DragOverlayCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1.05, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5,
      }}
      className="bg-muted/90 border-2 border-primary/80 rounded-lg p-4 shadow-[var(--kanban-drag-shadow)] w-80 pointer-events-none"
    >
      {/* Segment Icon + Company Name */}
      <div className="flex items-center gap-2 mb-2">
        {(() => {
          const SegmentIcon = getSegmentIcon(lead.segment);
          const segmentColor = getSegmentColor(lead.segment);
          return <SegmentIcon className={`w-5 h-5 flex-shrink-0 ${segmentColor}`} />;
        })()}
        <h3 className="font-semibold text-foreground truncate flex-1">{lead.companyName}</h3>
      </div>

      {/* Contact and Phone */}
      <div className="space-y-1 mb-3 text-sm">
        {lead.contactName && (
          <p className="text-foreground truncate">
            <span className="text-muted-foreground">Contato:</span> {lead.contactName}
          </p>
        )}
        {lead.phone && (
          <p className="text-foreground truncate">
            <span className="text-muted-foreground">Tel:</span> {lead.phone}
          </p>
        )}
      </div>

      {/* Date Badge */}
      {lead.dataCriacao && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary text-xs">
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
          {lead.category && (
            <Badge className={CATEGORY_COLORS[lead.category as keyof typeof CATEGORY_COLORS]}>
              {lead.category}
            </Badge>
          )}
        </div>
      )}
      {!lead.dataCriacao && lead.category && (
        <div className="mb-3">
          <Badge className={CATEGORY_COLORS[lead.category as keyof typeof CATEGORY_COLORS]}>
            {lead.category}
          </Badge>
        </div>
      )}
    </motion.div>
  );
}
