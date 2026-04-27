import { Phone, User, Calendar, MapPin, Mail, Globe, DollarSign } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Lead } from "../../../drizzle/schema";

interface DuplicateGroup {
  key: string;
  type: "name" | "phone";
  value: string;
  leads: Lead[];
  count: number;
}

interface Props {
  group: DuplicateGroup;
  onKeepNewest: (group: DuplicateGroup) => void;
  onMerge: (group: DuplicateGroup) => void;
  onIgnore: (groupKey: string) => void;
}

export function DuplicateGroupCard({ group, onKeepNewest, onMerge, onIgnore }: Props) {
  // Ordenar leads por data de criação (mais recente primeiro)
  const sortedLeads = [...group.leads].sort(
    (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "-";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/50 backdrop-blur-sm shadow-lg">
      {/* Header do grupo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {group.type === "phone" ? (
            <Phone className="w-5 h-5 text-primary" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold text-white">
            {group.type === "phone" ? "Telefone" : "Nome"}: {group.value}
          </h3>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            {group.count} leads
          </Badge>
        </div>
      </div>

      {/* Lista de leads duplicados */}
      <div className="space-y-2 mb-3">
        {sortedLeads.map((lead, index) => (
          <div
            key={lead.id}
            className={`p-3 rounded transition-all ${
              index === 0
                ? "bg-green-900/20 border-2 border-green-500/50"
                : "bg-muted/30 border border-border/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-white">{lead.companyName}</span>
                  {index === 0 && (
                    <Badge className="bg-green-600 text-white">Mais recente</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Criado: {formatDate(lead.dataCriacao)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="text-xs">{lead.status}</Badge>
                  </div>
                  {lead.contactName && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.contactName}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.city}</span>
                    </div>
                  )}
                  {lead.site && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{lead.site}</span>
                    </div>
                  )}
                  {(lead.implementationValue || lead.recurringValue) && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {formatCurrency(lead.implementationValue)} +{" "}
                        {formatCurrency(lead.recurringValue)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {lead.segment}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onKeepNewest(group)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Manter Mais Recente
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onMerge(group)}
          className="border-border text-primary hover:bg-primary/10"
        >
          Mesclar Todos
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onIgnore(group.key)}
          className="text-muted-foreground hover:text-white hover:bg-muted/50"
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}
