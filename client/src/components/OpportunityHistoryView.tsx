import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, SearchX } from "lucide-react";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Button } from "./ui/button";
import { toast } from "sonner";

type OutcomeFilter = "all" | "won" | "lost" | "abandoned";
type DateFilter = "all" | "7d" | "15d" | "30d" | "custom";

function outcomeLabel(status?: string | null) {
  if (status === "won") return "Ganho";
  if (status === "lost") return "Perdido";
  if (status === "abandoned") return "Abandonado";
  return status || "-";
}

function closedAtLabel(opportunity: any) {
  const dateValue = opportunity?.wonAt || opportunity?.lostAt || opportunity?.updatedAt;
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createdAtLabel(opportunity: any) {
  if (!opportunity?.createdAt) return "-";
  const date = new Date(opportunity.createdAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function resolveOutcomeDate(opportunity: any): Date | null {
  const dateValue = opportunity?.wonAt || opportunity?.lostAt || opportunity?.updatedAt;
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function OpportunityHistoryView({ pipelineId }: { pipelineId?: number }) {
  const [statusFilter, setStatusFilter] = useState<OutcomeFilter>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const reopenMutation = trpc.opportunities.reopen.useMutation();
  const utils = trpc.useUtils();

  const queryInput = useMemo(
    () => ({
      pipelineId,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    [pipelineId, statusFilter, search]
  );

  const { data: opportunities, isLoading } = trpc.opportunities.closedList.useQuery(queryInput, {
    enabled: !!pipelineId,
  });

  const dateRangeError = useMemo(() => {
    if (dateFilter !== "custom" || !dateStart || !dateEnd) return null;
    const start = new Date(`${dateStart}T00:00:00`);
    const end = new Date(`${dateEnd}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Periodo invalido.";
    if (start.getTime() > end.getTime()) return "Data inicial deve ser menor ou igual a data final.";
    return null;
  }, [dateFilter, dateStart, dateEnd]);

  const filteredByDate = useMemo(() => {
    const list = opportunities || [];
    if (dateFilter === "all") return list;

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateFilter === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === "15d") {
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFilter === "custom") {
      if (!dateStart || !dateEnd || dateRangeError) return [];
      startDate = new Date(`${dateStart}T00:00:00`);
      endDate = new Date(`${dateEnd}T23:59:59`);
    }

    return list.filter((opportunity: any) => {
      const outcomeDate = resolveOutcomeDate(opportunity);
      if (!outcomeDate || !startDate || !endDate) return false;
      const ts = outcomeDate.getTime();
      return ts >= startDate.getTime() && ts <= endDate.getTime();
    });
  }, [opportunities, dateFilter, dateStart, dateEnd, dateRangeError]);

  const handleReopen = async (opportunityId: number) => {
    const confirmed = window.confirm("Deseja reabrir esta oportunidade e devolve-la ao funil ativo?");
    if (!confirmed) return;

    try {
      await reopenMutation.mutateAsync({ opportunityId });
      toast.success("Oportunidade reaberta e devolvida ao funil.");
      await Promise.all([
        utils.opportunities.list.invalidate(),
        utils.opportunities.closedList.invalidate(),
        utils.opportunities.stats.invalidate(),
        utils.dashboard.stats.invalidate(),
        utils.dashboard.followUpAlerts.invalidate(),
      ]);
    } catch (error: any) {
      toast.error(`Erro ao reabrir oportunidade: ${error.message || error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card rounded-[10px] border mt-4">
        <SearchX className="w-8 h-8 mb-2" />
        <p>Nenhuma oportunidade finalizada encontrada para este filtro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por oportunidade, contato ou empresa..."
          className="sm:max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as OutcomeFilter)}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="won">Ganho</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
            <SelectItem value="abandoned">Abandonado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as DateFilter)}>
          <SelectTrigger className="sm:w-[210px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os periodos</SelectItem>
            <SelectItem value="7d">Ultimos 7 dias</SelectItem>
            <SelectItem value="15d">Ultimos 15 dias</SelectItem>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="custom">Periodo personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateFilter === "custom" && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="sm:w-[180px]"
          />
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="sm:w-[180px]"
          />
          {dateRangeError && <p className="text-xs text-destructive">{dateRangeError}</p>}
        </div>
      )}

      {filteredByDate.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card rounded-[10px] border mt-1">
          <SearchX className="w-8 h-8 mb-2" />
          <p>Nenhuma oportunidade finalizada encontrada para os filtros selecionados.</p>
        </div>
      ) : (
      <div className="bg-card rounded-[10px] border shadow-[var(--shadow-sm)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Oportunidade</TableHead>
              <TableHead>Empresa / Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data de fechamento</TableHead>
              <TableHead>Justificativa do desfecho</TableHead>
              <TableHead>Ultimo estagio</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredByDate.map((opp: any) => (
              <TableRow key={opp.id}>
                <TableCell className="font-medium">{opp.title || "-"}</TableCell>
                <TableCell>
                  {opp.contactCompany || "-"} {opp.contactName ? `(${opp.contactName})` : ""}
                </TableCell>
                <TableCell>{outcomeLabel(opp.status)}</TableCell>
                <TableCell>
                  {opp.monetaryValue !== null && opp.monetaryValue !== undefined && opp.monetaryValue !== ""
                    ? `R$ ${Number(opp.monetaryValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "-"}
                </TableCell>
                <TableCell>{closedAtLabel(opp)}</TableCell>
                <TableCell>{opp.outcomeReason || opp.lostReason || "-"}</TableCell>
                <TableCell>{opp.stageName || "-"}</TableCell>
                <TableCell>{createdAtLabel(opp)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleReopen(opp.id)}
                      disabled={reopenMutation.isPending}
                    >
                      Reabrir
                    </Button>
                    <OpportunityFormDialog
                      opportunity={opp}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                          Ver / Editar
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
