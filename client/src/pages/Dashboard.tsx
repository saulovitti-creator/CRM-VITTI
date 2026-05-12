import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  BarChart3,
  Target,
  Loader2,
  Trophy,
  Thermometer,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<{ dataInicial?: Date; dataFinal?: Date; isActive: boolean }>({ isActive: false });

  const dashboardStatsInput = useMemo(() => ({
    pipelineId: undefined,
    dataInicial: dateFilter.isActive ? dateFilter.dataInicial : undefined,
    dataFinal: dateFilter.isActive ? dateFilter.dataFinal : undefined,
  }), [dateFilter.dataFinal, dateFilter.dataInicial, dateFilter.isActive]);

  const statsQuery = trpc.dashboard.stats.useQuery(dashboardStatsInput);
  const alertsQuery = trpc.dashboard.followUpAlerts.useQuery({ days: 3 });

  const stats = statsQuery.data;
  const alerts = alertsQuery.data || [];

  useEffect(() => {
    console.log("[dashboard.stats] input", {
      isActive: dateFilter.isActive,
      dataInicial: dashboardStatsInput.dataInicial?.toISOString(),
      dataFinal: dashboardStatsInput.dataFinal?.toISOString(),
    });
  }, [dashboardStatsInput.dataFinal, dashboardStatsInput.dataInicial, dateFilter.isActive]);

  useEffect(() => {
    if (statsQuery.error) {
      console.error("[dashboard.stats] error", statsQuery.error);
    }
  }, [statsQuery.error]);

  useEffect(() => {
    if (!statsQuery.data) return;
    console.log("[dashboard.stats] data summary", {
      openOpportunities: statsQuery.data.openOpportunities,
      openValue: statsQuery.data.openValue,
      totalCreatedOpportunities: statsQuery.data.totalCreatedOpportunities,
      stageKeys: Object.keys(statsQuery.data.opportunitiesByStage || {}),
    });

    [
      "openOpportunities",
      "openValue",
      "wonOpportunities",
      "lostOpportunities",
      "abandonedOpportunities",
      "totalCreatedOpportunities",
      "conversionRate",
      "lossRate",
      "abandonmentRate",
      "opportunitiesByStage",
      "opportunitiesCreatedByMonth",
      "opportunitiesBySegment",
      "coldOpportunities",
    ].forEach((field) => {
      if ((statsQuery.data as any)[field] === undefined) {
        console.warn("[dashboard.stats] missing field", field);
      }
    });
  }, [statsQuery.data]);

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };

  const chartData = useMemo(() => {
    const monthly = stats?.opportunitiesCreatedByMonth || stats?.opportunitiesByMonth;
    if (!monthly) return [];
    return monthly.map((m: any) => {
      const [year, month] = m.month.split("-");
      return { label: `${monthNames[month]}/${year.slice(2)}`, count: m.count };
    });
  }, [stats?.opportunitiesCreatedByMonth, stats?.opportunitiesByMonth]);

  const maxChart = useMemo(() => Math.max(...chartData.map((d: any) => d.count), 1), [chartData]);

  const segmentData = useMemo(() => {
    if (!stats?.opportunitiesBySegment) return [];
    return Object.entries(stats.opportunitiesBySegment)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8);
  }, [stats?.opportunitiesBySegment]);

  const segmentMax = useMemo(() => Math.max(...segmentData.map(([, v]) => v as number), 1), [segmentData]);

  const stageColors = ["bg-blue-500", "bg-amber-500", "bg-orange-500", "bg-green-500", "bg-slate-500", "bg-cyan-500"];
  const stageMetrics = useMemo(() => {
    const byStage = stats?.opportunitiesByStage || {};
    return Object.entries(byStage).map(([key], index) => ({
      key,
      color: stageColors[index % stageColors.length],
    }));
  }, [stats?.opportunitiesByStage]);

  const funnelMax = useMemo(() => {
    if (!stats?.opportunitiesByStage) return 1;
    return Math.max(...Object.values(stats.opportunitiesByStage).map(Number), 1);
  }, [stats?.opportunitiesByStage]);

  if (statsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-page-title">Dashboard Analítico</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão comercial - funil ativo e desfechos</p>
          </div>
          <DateFilterDropdown onFilterChange={setDateFilter} initialFilter={dateFilter} />
        </div>

        {statsQuery.error && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="py-3 px-4">
              <p className="text-sm font-medium text-destructive">Erro ao carregar métricas do Dashboard. Verifique os logs.</p>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Oportunidades */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Oportunidades Abertas</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.openOpportunities || 0}</p>
                  <p className="text-metadata mt-1">No funil ativo</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.conversionRate ?? stats?.taxaConversao ?? 0}%</p>
                  <p className="text-metadata mt-1">{stats?.wonOpportunities || 0} de {stats?.closedOpportunities || 0} finalizadas</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--success-light)] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Perda */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Taxa de Perda</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.lossRate || 0}%</p>
                  <p className="text-metadata mt-1">{stats?.lostOpportunities || 0} perdidas</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--error-light)] flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Abandono */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Taxa de Abandono</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.abandonmentRate || 0}%</p>
                  <p className="text-metadata mt-1">{stats?.abandonedOpportunities || 0} abandonadas</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards Row 2 - Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Valor em Aberto</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats?.openValue ?? stats?.dinheiroNaMesa?.implementacao ?? 0)}
                  </p>
                  <p className="text-metadata mt-1">Soma das oportunidades abertas</p>
                </div>
                <DollarSign className="w-6 h-6 text-[var(--success)] opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Receita Ganha</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats?.wonValue ?? stats?.valorTotalGanho ?? 0)}
                  </p>
                  <p className="text-metadata mt-1">{stats?.wonOpportunities || 0} oportunidades ganhas</p>
                </div>
                <Target className="w-6 h-6 text-primary opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Oportunidades Criadas</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {stats?.totalCreatedOpportunities ?? stats?.totalOpportunities ?? 0}
                  </p>
                  <p className="text-metadata mt-1">Criadas no período filtrado</p>
                </div>
                <Trophy className="w-6 h-6 text-[var(--warning)] opacity-40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funil Ativo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Funil Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stageMetrics.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">Sem oportunidades abertas no funil ativo</p>
              ) : stageMetrics.map((s) => {
                const count = stats?.opportunitiesByStage?.[s.key] || 0;
                const pct = funnelMax > 0 ? (count / funnelMax) * 100 : 0;
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate max-w-[180px]">{s.key}</span>
                      <span className="text-muted-foreground tabular-nums font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`${s.color} h-full rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Oportunidades por Mês */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Oportunidades Criadas por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">Sem dados suficientes</p>
              ) : (
                <div className="flex items-end gap-2 h-44 pt-4">
                  {chartData.map((d: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-primary font-semibold tabular-nums">{d.count}</span>
                      <div
                        className="w-full bg-primary/80 rounded-t-md transition-all duration-500 ease-out"
                        style={{ height: `${(d.count / maxChart) * 100}%`, minHeight: "4px" }}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contatos por Segmento */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Distribuição por Segmento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {segmentData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Sem segmentos</p>
              ) : (
                segmentData.map(([seg, count], i) => {
                  const pct = segmentMax > 0 ? ((count as number) / segmentMax) * 100 : 0;
                  return (
                    <div key={seg} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground truncate max-w-[180px]">{seg}</span>
                        <span className="text-muted-foreground tabular-nums font-medium">{count as number}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%`, opacity: 1 - (i * 0.08) }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Alertas de Follow-up */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-destructive" /> Oportunidades Frias (sem contato há 3+ dias)
                <span className="ml-auto badge-error text-xs font-semibold px-2 py-0.5 rounded-md">
                  {stats?.coldOpportunities || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--success)] text-sm font-medium">Nenhuma oportunidade fria! Todas contatadas recentemente.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {alerts.slice(0, 15).map((opportunity: any) => {
                    const daysSince = opportunity.lastContactAt
                      ? Math.floor((Date.now() - new Date(opportunity.lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <div
                        key={opportunity.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border hover:border-destructive/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium text-sm truncate">{opportunity.companyName}</p>
                          <p className="text-muted-foreground text-xs">{opportunity.contactName || "Sem contato"} - {opportunity.status}</p>
                        </div>
                        <span className="badge-error text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ml-3">
                          {daysSince !== null ? `${daysSince}d atrás` : "Nunca"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
