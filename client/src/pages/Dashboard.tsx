import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  Target,
  Loader2,
  Trophy,
  XCircle,
  Thermometer,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dateFilter, setDateFilter] = useState<{ dataInicial?: Date; dataFinal?: Date; isActive: boolean }>({ isActive: false });

  const statsQuery = trpc.dashboard.stats.useQuery({ 
    type: undefined,
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
    if (!stats?.leadsPorMes) return [];
    return stats.leadsPorMes.map((m: any) => {
      const [year, month] = m.month.split("-");
      return { label: `${monthNames[month]}/${year.slice(2)}`, count: m.count };
    });
  }, [stats?.leadsPorMes]);

  const maxChart = useMemo(() => Math.max(...chartData.map((d: any) => d.count), 1), [chartData]);

  const segmentData = useMemo(() => {
    if (!stats?.leadsPorSegmento) return [];
    return Object.entries(stats.leadsPorSegmento)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8);
  }, [stats?.leadsPorSegmento]);

  const segmentMax = useMemo(() => Math.max(...segmentData.map(([, v]) => v as number), 1), [segmentData]);

  const segmentColors = [
    "from-cyan-500 to-blue-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-amber-500 to-orange-500",
    "from-red-500 to-rose-500",
    "from-indigo-500 to-violet-500",
    "from-teal-500 to-cyan-500",
    "from-fuchsia-500 to-purple-500",
  ];

  const funnelStatuses = [
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
    if (!stats?.countByStatus) return 1;
    return Math.max(...Object.values(stats.countByStatus).map(Number), 1);
  }, [stats?.countByStatus]);

  if (statsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyan-500/30 bg-gradient-to-r from-slate-900/80 via-slate-900/70 to-slate-900/80 shadow-2xl shadow-cyan-500/10">
        <div className="w-full px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Logo Vitti" className="h-[36px] w-auto object-contain rounded-md shadow-sm" />
              <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Dashboard Analítico
              </h1>
            </div>
              <p className="text-sm text-slate-400 mt-1">Visão de Dono — Saúde do Funil de Vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DateFilterDropdown onFilterChange={setDateFilter} initialFilter={dateFilter} />
            <p className="text-sm text-slate-500 hidden md:block">{user?.name || "Gestor"}</p>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8 space-y-8">
        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Leads */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total de Leads</p>
                  <p className="text-4xl font-black text-cyan-400 mt-1">{stats?.totalLeads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-green-500/20 backdrop-blur-sm hover:border-green-400/50 transition-all duration-300">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Taxa de Conversão</p>
                  <p className="text-4xl font-black text-green-400 mt-1">{stats?.taxaConversao || 0}%</p>
                  <p className="text-xs text-slate-500 mt-1">{stats?.ganhos || 0} ganhos</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Perda */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-red-500/20 backdrop-blur-sm hover:border-red-400/50 transition-all duration-300">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Taxa Dropout</p>
                  <p className="text-4xl font-black text-red-400 mt-1">{stats?.taxaDropout || 0}%</p>
                  <p className="text-xs text-slate-500 mt-1">{stats?.perdidos || 0} perdidos</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tempo Médio */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-purple-500/20 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tempo Médio no Funil</p>
                  <p className="text-4xl font-black text-purple-400 mt-1">{stats?.tempoMedioFunil || 0}<span className="text-lg ml-1">dias</span></p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards Row 2 — Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Dinheiro na Mesa (Implementação) */}
          <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 border-emerald-500/20 backdrop-blur-sm">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">💰 Dinheiro na Mesa (Setup)</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {formatCurrency(stats?.dinheiroNaMesa?.implementacao || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Implantação de leads ativos</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-500/40" />
              </div>
            </CardContent>
          </Card>

          {/* Dinheiro na Mesa (Recorrência) */}
          <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 border-blue-500/20 backdrop-blur-sm">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">🔁 Dinheiro na Mesa (MRR)</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">
                    {formatCurrency(stats?.dinheiroNaMesa?.recorrencia || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Recorrência mensal projetada</p>
                </div>
                <Target className="w-8 h-8 text-blue-500/40" />
              </div>
            </CardContent>
          </Card>

          {/* Valor Total Ganho */}
          <Card className="bg-gradient-to-br from-yellow-900/30 to-slate-900/80 border-yellow-500/20 backdrop-blur-sm">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">🏆 Receita Fechada</p>
                  <p className="text-2xl font-black text-yellow-400 mt-1">
                    {formatCurrency(stats?.valorTotalGanho || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Valor fechado em contratos ganhos</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-500/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Funil de Vendas */}
          <Card className="bg-slate-800/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> Funil de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnelStatuses.map((s) => {
                const count = stats?.countByStatus?.[s.key] || 0;
                const pct = funnelMax > 0 ? (count / funnelMax) * 100 : 0;
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 truncate max-w-[180px]">{s.key}</span>
                      <span className="text-slate-400 font-mono font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${s.color} h-full rounded-full transition-transform duration-300 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Leads por Mês */}
          <Card className="bg-slate-800/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Evolução Mensal de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-10">Sem dados suficientes</p>
              ) : (
                <div className="flex items-end gap-3 h-48 pt-4">
                  {chartData.map((d: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-cyan-300 font-bold">{d.count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md transition-transform duration-300"
                        style={{ height: `${(d.count / maxChart) * 100}%`, minHeight: "8px" }}
                      />
                      <span className="text-[10px] text-slate-500">{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Leads por Segmento */}
          <Card className="bg-slate-800/50 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-base flex items-center gap-2">
                <Target className="w-5 h-5" /> Distribuição por Segmento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {segmentData.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Sem segmentos</p>
              ) : (
                segmentData.map(([seg, count], i) => {
                  const pct = segmentMax > 0 ? ((count as number) / segmentMax) * 100 : 0;
                  return (
                    <div key={seg} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300 truncate max-w-[180px]">{seg}</span>
                        <span className="text-slate-400 font-mono font-semibold">{count as number}</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${segmentColors[i % segmentColors.length]} h-full rounded-full transition-all duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Alertas de Follow-up */}
          <Card className="bg-slate-800/50 border-red-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-base flex items-center gap-2">
                <Thermometer className="w-5 h-5" /> Leads Frios (sem contato há 3+ dias)
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full border border-red-500/30">
                  {stats?.leadsFrios || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-green-400 text-sm font-semibold">✅ Nenhum lead frio! Todos contatados recentemente.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {alerts.slice(0, 15).map((lead: any) => {
                    const daysSince = lead.lastContactAt
                      ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-red-500/20 hover:border-red-400/40 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-100 font-semibold text-sm truncate">{lead.companyName}</p>
                          <p className="text-slate-400 text-xs">{lead.contactName || "Sem contato"} • {lead.status}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                          {daysSince !== null ? `${daysSince}d atrás` : "Nunca contatado"}
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
    </div>
  );
}
