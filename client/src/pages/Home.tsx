import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, LogOut, Download, Upload, Trash2, BarChart3, Settings, X, Scan } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LEAD_CATEGORIES, LEAD_STATUSES, STATUS_COLORS, CATEGORY_COLORS } from "@shared/types";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { LeadNotesDialog } from "@/components/LeadNotesDialog";
import { DownloadTemplateButton } from "@/components/DownloadTemplateButton";
import { ImportXLSXDialog } from "@/components/ImportXLSXDialog";
import { ClearDatabaseDialog } from "@/components/ClearDatabaseDialog";
import TabBar from "@/components/TabBar";
import { useLeadType } from "@/hooks/useLeadType";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useViewMode } from "@/hooks/useViewMode";
import { useFiltersPersistence } from "@/hooks/useFiltersPersistence";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatPhoneForDisplay } from "@/lib/whatsapp";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { DuplicatesResolverModal } from "@/components/DuplicatesResolverModal";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import ColumnManagementModal from "@/components/ColumnManagementModal";
import * as XLSX from "xlsx";
import { TodayTasks } from "@/components/TodayTasks";

export default function Home() {
  const { user, logout } = useAuth();
  const { activeType, setType, isLoaded } = useLeadType();
  const { viewMode, changeViewMode, isLoaded: viewModeLoaded } = useViewMode();
  const {
    searchTerm,
    selectedCategory,
    selectedStatus,
    siteStatus,
    selectedCity,
    setSearchTerm,
    setSelectedCategory,
    setSelectedStatus,
    setSiteStatus,
    setSelectedCity,
  } = useFiltersPersistence(activeType);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ dataInicial?: Date; dataFinal?: Date; isActive: boolean }>({ isActive: false });
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [uniqueSegments, setUniqueSegments] = useState<string[]>([]);
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [duplicateLeadIds, setDuplicateLeadIds] = useState<Set<number>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingFiltered, setIsDeletingFiltered] = useState(false);
  const [showDeleteFilteredConfirm, setShowDeleteFilteredConfirm] = useState(false);

  const segmentsQuery = trpc.leads.getUniqueSegments.useQuery({ type: activeType });

  useEffect(() => {
    if (segmentsQuery.data) {
      setUniqueSegments(segmentsQuery.data);
    }
  }, [segmentsQuery.data]);

  const leadsQuery = trpc.leads.list.useQuery({
    searchTerm: searchTerm || undefined,
    segment: selectedCategory || undefined,
    status: selectedStatus || undefined,
    type: activeType,
    city: selectedCity || undefined,
    dataInicial: dateFilter.dataInicial,
    dataFinal: dateFilter.dataFinal,
    siteStatus: siteStatus || undefined,
  });

  const deleteFilteredMutation = trpc.leads.deleteFiltered.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ ${data.deleted} lead(s) apagado(s) com sucesso!`);
      leadsQuery.refetch();
      const utils = trpc.useUtils();
      utils.leads.stats.invalidate();
      utils.leads.countByType.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao apagar leads filtrados");
    },
  });

  const statsQuery = trpc.leads.stats.useQuery({ type: activeType });
  const crmCountQuery = trpc.leads.countByType.useQuery({ type: "CRM" });
  const siteCountQuery = trpc.leads.countByType.useQuery({ type: "Site" });

  const leads = leadsQuery.data || [];
  const stats = statsQuery.data || {};
  const crmCount = crmCountQuery.data || 0;
  const siteCount = siteCountQuery.data || 0;

  // Sempre que trocar de aba (CRM/Site), limpar modo duplicados para evitar confusão.
  useEffect(() => {
    setDuplicatesOnly(false);
    setDuplicateLeadIds(new Set());
    setDuplicateGroups([]);
    setDuplicatesModalOpen(false);
  }, [activeType]);

  const duplicatesSummary = useMemo(() => {
    const groups = Array.isArray(duplicateGroups) ? duplicateGroups : [];
    const totalGroups = groups.length;
    const totalLeads = groups.reduce(
      (sum: number, g: any) => sum + (g?.count ?? g?.leads?.length ?? 0),
      0
    );
    return { totalGroups, totalLeads };
  }, [duplicateGroups]);

  // Cidades únicas para filtro
  const uniqueCities = useMemo(() => {
    const cities = leads
      .map((l: any) => l.city)
      .filter((c: any) => c && c.trim() !== "" && c !== "-");
    return Array.from(new Set<string>(cities)).sort();
  }, [leads]);

  const visibleLeads = useMemo(() => {
    if (!duplicatesOnly) return leads;
    if (!duplicateLeadIds || duplicateLeadIds.size === 0) return [];
    return leads.filter((l: any) => duplicateLeadIds.has(l.id));
  }, [leads, duplicatesOnly, duplicateLeadIds]);

  const handleDeleteFiltered = async () => {
    const ids = visibleLeads.map((l: any) => l.id);
    setIsDeletingFiltered(true);
    setShowDeleteFilteredConfirm(false);
    try {
      await deleteFilteredMutation.mutateAsync({ ids });
    } finally {
      setIsDeletingFiltered(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Query para varrer duplicados
  const scanDuplicatesQuery = trpc.leads.scanDuplicates.useQuery(
    { type: activeType },
    { enabled: false } // Não executar automaticamente
  );

  // Função para varrer base por duplicados
  const scanDuplicates = async () => {
    // Toggle: se já estiver no modo duplicados, apenas limpa o filtro
    if (duplicatesOnly) {
      setDuplicatesOnly(false);
      setDuplicateLeadIds(new Set());
      setDuplicateGroups([]);
      setDuplicatesModalOpen(false);
      toast.info("Filtro de duplicados desativado.");
      return;
    }

    setIsScanning(true);
    try {
      const result = await scanDuplicatesQuery.refetch();
      
      const groups = (result.data || []) as any[];

      if (!groups || groups.length === 0) {
        toast.info("✅ Nenhum duplicado encontrado na base!");
        setDuplicateGroups([]);
        setDuplicateLeadIds(new Set());
        setDuplicatesOnly(false);
      } else {
        // Guardar grupos (para o modal) e ativar filtro na tabela
        setDuplicateGroups(groups);
        const ids = new Set<number>();
        for (const g of groups) {
          (g?.leads || []).forEach((l: any) => ids.add(l.id));
        }
        setDuplicateLeadIds(ids);
        setDuplicatesOnly(true);

        toast.success(`🔎 Encontrados ${groups.length} grupos (${ids.size} leads) duplicados.`);
      }
    } catch (error) {
      toast.error("❌ Erro ao varrer base por duplicados");
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  // Função para exportar dados para XLSX
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataToExport = visibleLeads.map((lead: any) => ({
        "Empresa *": lead.companyName,
        "Contato": lead.contactName || "-",
        "Telefone *": formatPhoneForDisplay(lead.phone),
        "Email": lead.email || "-",
        "Segmento *": lead.segment || "-",
        "Status *": lead.status || "-",
        "Site": lead.site || "-",
        "Cidade": lead.city || "-",
        "Notas": lead.notes || "-",
      }));

      // Criar workbook e worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Definir largura das colunas
      worksheet["!cols"] = [
        { wch: 25 }, // Empresa
        { wch: 20 }, // Contato
        { wch: 18 }, // Telefone
        { wch: 25 }, // Email
        { wch: 15 }, // Segmento
        { wch: 20 }, // Status
        { wch: 25 }, // Site
        { wch: 15 }, // Cidade
        { wch: 30 }, // Notas
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Prospectos");

      // Gerar nome do arquivo com data
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, "0")}_${String(today.getMonth() + 1).padStart(2, "0")}_${today.getFullYear()}`;
      const filename = `prospectos_${activeType.toLowerCase()}_${dateStr}.xlsx`;

      // Fazer download
      XLSX.writeFile(workbook, filename);

      toast.success(`✅ Arquivo exportado com sucesso! (${visibleLeads.length} registros)`);
    } catch (error) {
      toast.error("❌ Erro ao exportar dados");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyan-500/30 bg-gradient-to-r from-slate-900/80 via-slate-900/70 to-slate-900/80 shadow-2xl shadow-cyan-500/10">
        <div className="w-full px-4 py-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Logo Vitti" className="h-[42px] w-auto object-contain rounded-md shadow-sm" />
              <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                CRM Vitti Soluções
              </h1>
            </div>
            <p className="text-sm text-slate-400/80 font-medium tracking-wide">Gerenciamento de Prospectos Premium</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Bem-vindo</p>
              <p className="text-lg font-semibold text-cyan-400">{user?.name || "Usuário"}</p>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-cyan-500/50 to-blue-500/50"></div>
            <Button variant="outline" size="sm" onClick={() => setColumnModalOpen(true)} className="border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-red-600/30 hover:text-red-400 hover:border-red-500 font-semibold transition-all duration-300">
              <Settings className="w-4 h-4 mr-2" />
              Colunas
            </Button>
            <a href="/dashboard">
              <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600/30 hover:text-emerald-300 hover:border-emerald-400 font-semibold transition-all duration-300">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-red-600/30 hover:text-red-400 hover:border-red-500 font-semibold transition-all duration-300">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 py-8">
        {/* Tab Bar */}
        {isLoaded && (
          <TabBar
            activeTab={activeType}
            onTabChange={setType}
            crmCount={crmCount}
            siteCount={siteCount}
          />
        )}

        {/* Tarefas de Hoje Widget */}
        <TodayTasks />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {LEAD_STATUSES.map((status) => {
            const getStatusGradient = (s: string) => {
              if (s === "Entrar em contato") return "from-blue-600 to-blue-800";
              if (s === "Contatado") return "from-amber-600 to-amber-800";
              if (s === "Não Respondeu") return "from-orange-600 to-orange-800";
              if (s === "Interessado") return "from-green-600 to-green-800";
              return "from-slate-600 to-slate-800";
            };
            return (
              <div key={status} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <Card className={`relative bg-gradient-to-br ${getStatusGradient(status)} text-white border-cyan-500/30 hover:border-cyan-400/60 transition-colors duration-200 hover:shadow-lg hover:shadow-cyan-500/10`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">
                      {status}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-cyan-100">
                      {stats[status] || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Filters Section */}
        <Card className="mb-8 bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400">Filtros</CardTitle>
            <CardDescription className="text-slate-400">Busque e filtre seus prospectos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <DateFilterDropdown onFilterChange={setDateFilter} initialFilter={dateFilter} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(searchTerm || selectedCategory || selectedStatus || selectedCity || siteStatus !== 'all') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory(null);
                      setSelectedStatus(null);
                      setSiteStatus('all');
                      setSelectedCity(null);
                      toast.success("Filtros limpos");
                    }}
                    className="bg-slate-700/50 border-cyan-500/30 text-cyan-400 hover:bg-slate-600/50 hover:text-cyan-300 mr-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Todos
                  </Button>
                  
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer items-center gap-1 py-1 px-3" onClick={() => setSearchTerm('')}>
                      Busca: <span className="font-semibold">{searchTerm}</span> <X size={12} className="ml-1" />
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer items-center gap-1 py-1 px-3" onClick={() => setSelectedCategory(null)}>
                      Segmento: <span className="font-semibold">{selectedCategory}</span> <X size={12} className="ml-1" />
                    </Badge>
                  )}
                  {selectedStatus && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer items-center gap-1 py-1 px-3" onClick={() => setSelectedStatus(null)}>
                      Status: <span className="font-semibold">{selectedStatus}</span> <X size={12} className="ml-1" />
                    </Badge>
                  )}
                  {selectedCity && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer items-center gap-1 py-1 px-3" onClick={() => setSelectedCity(null)}>
                      Cidade: <span className="font-semibold">{selectedCity}</span> <X size={12} className="ml-1" />
                    </Badge>
                  )}
                  {siteStatus !== 'all' && (
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 cursor-pointer items-center gap-1 py-1 px-3" onClick={() => setSiteStatus('all')}>
                      Site: <span className="font-semibold">{siteStatus === 'with_site' ? 'Com Site' : 'Sem Site'}</span> <X size={12} className="ml-1" />
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Buscar
                </label>
                <div className="relative">
                  <Input
                    placeholder="Empresa, contato, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/50 pr-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Limpar busca"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Segmento
                </label>
                <div className="relative">
                  <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 pr-10">
                      <SelectValue placeholder="Todos os segmentos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem value="all">Todos os segmentos</SelectItem>
                      {uniqueSegments.map((segment) => (
                        <SelectItem key={segment} value={segment}>
                          {segment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto"
                      title="Limpar segmento"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Status
                </label>
                <div className="relative">
                  <Select value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? null : v)}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 pr-10">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem value="all">Todos os status</SelectItem>
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStatus && (
                    <button
                      onClick={() => setSelectedStatus(null)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto"
                      title="Limpar status"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Localização
                </label>
                <div className="relative">
                  <Select value={selectedCity || "all"} onValueChange={(v) => setSelectedCity(v === "all" ? null : v)}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 pr-10">
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCity && (
                    <button
                      onClick={() => setSelectedCity(null)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto"
                      title="Limpar filtro de cidade"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Site
                </label>
                <div className="relative">
                  <Select value={siteStatus} onValueChange={(v) => setSiteStatus(v as 'all' | 'with_site' | 'without_site')}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 pr-10">
                      <SelectValue placeholder="Filtrar por site" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem value="all">Todos os Leads</SelectItem>
                      <SelectItem value="without_site">Sem Site (Prioridade)</SelectItem>
                      <SelectItem value="with_site">Com Site</SelectItem>
                    </SelectContent>
                  </Select>
                  {siteStatus !== 'all' && (
                    <button
                      onClick={() => setSiteStatus('all')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto"
                      title="Limpar filtro de site"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        {viewModeLoaded && (
          <ViewToggle viewMode={viewMode} onViewModeChange={changeViewMode} />
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <Card className="bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-cyan-400">Quadro Kanban</CardTitle>
            </CardHeader>
            <CardContent>
              <KanbanBoard leads={leads} stats={stats} />
            </CardContent>
          </Card>
        )}

        {/* Leads List */}
        {viewMode === "list" && (
        <Card className="bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-cyan-400">Prospectos</CardTitle>
                <CardDescription className="text-slate-400">
                  Total: {visibleLeads.length} prospecto{visibleLeads.length !== 1 ? "s" : ""}
                  {duplicatesOnly && (
                    <span className="ml-2 text-yellow-400">
                      (somente duplicados: {duplicatesSummary.totalGroups} grupos)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <DownloadTemplateButton />
                <ImportXLSXDialog leadType={activeType} />

                {duplicatesOnly && duplicateGroups.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDuplicatesModalOpen(true)}
                    className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400 font-semibold transition-all duration-300"
                  >
                    Resolver Duplicados
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={scanDuplicates}
                  disabled={isScanning}
                  className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 hover:text-yellow-300 hover:border-yellow-400 font-semibold transition-all duration-300"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Varrendo...
                    </>
                  ) : duplicatesOnly ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Limpar filtro
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Varrer Duplicados
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-600/30 hover:text-blue-400 hover:border-blue-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleExport}
                  disabled={isExporting || visibleLeads.length === 0}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar ({visibleLeads.length})
                    </>
                  )}
                </Button>
                <LeadFormDialog type={activeType} />
                {/* Botão Apagar Filtrados */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeletingFiltered || visibleLeads.length === 0}
                  onClick={() => setShowDeleteFilteredConfirm(true)}
                  className="border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingFiltered ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Apagar Filtrados ({visibleLeads.length})
                    </>
                  )}
                </Button>
                <ClearDatabaseDialog />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leadsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : visibleLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">
                  {duplicatesOnly
                    ? "Nenhum duplicado encontrado com os filtros atuais"
                    : "Nenhum prospecto encontrado"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-cyan-500/20">
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Empresa</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Contato</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Telefone</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Segmento</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Valor Impl.</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Valor Recor.</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Valor Total</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Site</th>
                      <th className="text-left py-3 px-4 font-medium text-cyan-400 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeads.map((lead: any) => (
                      <tr key={lead.id} className="border-b border-cyan-500/10 hover:bg-slate-700/50 transition-colors duration-200">
                        <td className="py-3 px-4 font-medium text-slate-100 max-w-[180px] truncate">{lead.companyName}</td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{lead.contactName || "-"}</td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{formatPhoneForDisplay(lead.phone)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge className="bg-purple-600 text-white">
                            {lead.segment || "-"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge className={STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS]}>
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                          {lead.implementationValue ? `R$ ${parseFloat(String(lead.implementationValue)).toFixed(2).replace('.', ',')}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                          {lead.recurringValue ? `R$ ${parseFloat(String(lead.recurringValue)).toFixed(2).replace('.', ',')}` : "-"}
                        </td>
                        <td className={`py-3 px-4 text-xs font-semibold whitespace-nowrap ${
                          lead.implementationValue || lead.recurringValue
                            ? lead.implementationValue && lead.recurringValue
                              ? (parseFloat(String(lead.implementationValue)) + parseFloat(String(lead.recurringValue))) > 10000
                                ? 'text-green-400 bg-green-500/10'
                                : 'text-cyan-300'
                              : 'text-slate-300'
                            : 'text-slate-500'
                        }`}>
                          {lead.implementationValue || lead.recurringValue
                            ? `R$ ${(parseFloat(String(lead.implementationValue || 0)) + parseFloat(String(lead.recurringValue || 0))).toFixed(2).replace('.', ',')}`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 max-w-[200px] truncate">
                          {lead.site ? (
                            lead.site.includes('.') && !lead.site.includes(' ') ? (
                              <a 
                                href={lead.site.startsWith('http') ? lead.site : `https://${lead.site}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-cyan-400 hover:text-cyan-300 underline text-sm"
                              >
                                {lead.site}
                              </a>
                            ) : (
                              <span className="text-slate-300 text-sm">{lead.site}</span>
                            )
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            <WhatsAppButton phone={lead.phone} leadId={lead.id} />
                            <LeadFormDialog lead={lead} />
                            <LeadNotesDialog leadId={lead.id} companyName={lead.companyName} />
                            <DeleteLeadDialog
                              leadId={lead.id}
                              companyName={lead.companyName}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
      
      {/* Lead Details Modal */}
      <LeadDetailsModal
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onLeadUpdated={() => {
          leadsQuery.refetch();
          setSelectedLead(null);
        }}
      />

      {/* Column Management Modal */}
      <ColumnManagementModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
      />

      {/* Diálogo de Confirmação: Apagar Filtrados */}
      {showDeleteFilteredConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl shadow-red-500/10">
            <h3 className="text-lg font-bold text-red-400 mb-2">Confirmar exclusão</h3>
            <p className="text-slate-300 text-sm mb-6">
              Deseja apagar <strong className="text-red-300">{visibleLeads.length} lead(s)</strong> filtrado(s)?<br />
              <span className="text-slate-400 text-xs mt-1 block">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteFilteredConfirm(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteFiltered}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Sim, apagar {visibleLeads.length} lead(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Resolver Modal */}
      <DuplicatesResolverModal
        open={duplicatesModalOpen}
        onClose={() => setDuplicatesModalOpen(false)}
        duplicateGroups={duplicateGroups}
        type={activeType}
      />
    </div>
  );
}
