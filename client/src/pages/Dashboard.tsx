import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { useState } from "react";
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
import { useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<{ dataInicial?: Date; dataFinal?: Date; isActive: boolean }>({ isActive: false });

  const statsQuery = trpc.dashboard.stats.useQuery({ 
    pipelineId: undefined,
    dataInicial: dateFilter.dataInicial,
    dataFinal: dateFilter.dataFinal
  });
  const alertsQuery = trpc.dashboard.followUpAlerts.useQuery({ days: 3 });

  const stats = statsQuery.data;
  const alerts = alertsQuery.data || [];

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };

  const chartData = useMemo(() => {
    if (!stats?.opportunitiesByMonth) return [];
    return stats.opportunitiesByMonth.map((m: any) => {
      const [year, month] = m.month.split("-");
      return { label: `${monthNames[month]}/${year.slice(2)}`, count: m.count };
    });
  }, [stats?.opportunitiesByMonth]);

  const maxChart = useMemo(() => Math.max(...chartData.map((d: any) => d.count), 1), [chartData]);

  const segmentData = useMemo(() => {
    if (!stats?.opportunitiesBySegment) return [];
    return Object.entries(stats.opportunitiesBySegment)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8);
  }, [stats?.opportunitiesBySegment]);

  const segmentMax = useMemo(() => Math.max(...segmentData.map(([, v]) => v as number), 1), [segmentData]);

  const stageMetrics = [
    { key: "Entrar em contato", color: "bg-blue-500" },
    { key: "Contatado", color: "bg-amber-500" },
    { key: "Não Respondeu", color: "bg-orange-500" },
    { key: "Interessado", color: "bg-green-500" },
    { key: "Não possui Interesse", color: "bg-slate-500" },
    { key: "Ganho", color: "bg-emerald-500" },
    { key: "Perdido", color: "bg-red-500" },
    { key: "Abandonado", color: "bg-gray-500" },
  ];

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
            <p className="text-sm text-muted-foreground mt-1">Visão geral — Saúde do Funil de Vendas</p>
          </div>
          <DateFilterDropdown onFilterChange={setDateFilter} initialFilter={dateFilter} />
        </div>

        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Oportunidades */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Total de Oportunidades</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.totalOpportunities || 0}</p>
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
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.taxaConversao || 0}%</p>
                  <p className="text-metadata mt-1">{stats?.wonOpportunities || 0} ganhos</p>
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
                  <p className="text-label">Taxa Dropout</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.taxaDropout || 0}%</p>
                  <p className="text-metadata mt-1">{stats?.lostOpportunities || 0} perdidos</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--error-light)] flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tempo Médio */}
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Tempo Médio no Funil</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{stats?.tempoMedioFunil || 0}<span className="text-base font-medium ml-1 text-muted-foreground">dias</span></p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards Row 2 — Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Dinheiro na Mesa (Setup)</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats?.dinheiroNaMesa?.implementacao || 0)}
                  </p>
                  <p className="text-metadata mt-1">Implantação de oportunidades ativas</p>
                </div>
                <DollarSign className="w-6 h-6 text-[var(--success)] opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Dinheiro na Mesa (MRR)</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats?.dinheiroNaMesa?.recorrencia || 0)}
                  </p>
                  <p className="text-metadata mt-1">Recorrência mensal projetada</p>
                </div>
                <Target className="w-6 h-6 text-primary opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label">Receita Fechada</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(stats?.valorTotalGanho || 0)}
                  </p>
                  <p className="text-metadata mt-1">Valor fechado em contratos ganhos</p>
                </div>
                <Trophy className="w-6 h-6 text-[var(--warning)] opacity-40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funil de Vendas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Funil de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stageMetrics.map((s) => {
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
                <TrendingUp className="w-4 h-4 text-primary" /> Evolução Mensal de Oportunidades
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
                  <p className="text-[var(--success)] text-sm font-medium">✅ Nenhuma oportunidade fria! Todas contatadas recentemente.</p>
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
                          <p className="text-muted-foreground text-xs">{opportunity.contactName || "Sem contato"} • {opportunity.status}</p>
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
