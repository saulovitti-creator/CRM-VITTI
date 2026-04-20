import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar, X } from "lucide-react";

interface DateFilterState {
  dataInicial?: Date;
  dataFinal?: Date;
  isActive: boolean;
}

interface DateFilterDropdownProps {
  onFilterChange: (filter: DateFilterState) => void;
  initialFilter?: DateFilterState;
}

export function DateFilterDropdown({ onFilterChange, initialFilter }: DateFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<"atalho" | "personalizado" | "especifico">("atalho");
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");
  const [dataEspecifica, setDataEspecifica] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<DateFilterState>(initialFilter || { isActive: false });

  // Restaurar filtro do localStorage ao montar
  useEffect(() => {
    const savedFilter = localStorage.getItem("dateFilter");
    if (savedFilter) {
      try {
        const parsed = JSON.parse(savedFilter);
        setActiveFilter({
          ...parsed,
          dataInicial: parsed.dataInicial ? new Date(parsed.dataInicial) : undefined,
          dataFinal: parsed.dataFinal ? new Date(parsed.dataFinal) : undefined,
        });
      } catch (e) {
        console.error("Erro ao restaurar filtro de data:", e);
      }
    }
  }, []);

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "";
    return date.toLocaleDateString("pt-BR");
  };

  const handleAtalhoRapido = (tipo: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let dataInicial = new Date(hoje);
    let dataFinal = new Date(hoje);
    dataFinal.setHours(23, 59, 59, 999);

    switch (tipo) {
      case "hoje":
        break;
      case "7dias":
        dataInicial.setDate(hoje.getDate() - 7);
        break;
      case "30dias":
        dataInicial.setDate(hoje.getDate() - 30);
        break;
      case "mes":
        dataInicial.setDate(1);
        break;
      case "mespassado":
        dataInicial = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dataFinal = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        dataFinal.setHours(23, 59, 59, 999);
        break;
      case "ano":
        dataInicial = new Date(hoje.getFullYear(), 0, 1);
        break;
    }

    const newFilter = { dataInicial, dataFinal, isActive: true };
    setActiveFilter(newFilter);
    onFilterChange(newFilter);
    localStorage.setItem("dateFilter", JSON.stringify(newFilter));
    setIsOpen(false);
  };

  const handlePeriodoPersonalizado = () => {
    if (!dataInicial || !dataFinal) {
      alert("Preencha ambas as datas");
      return;
    }

    const inicio = new Date(dataInicial);
    const fim = new Date(dataFinal);
    fim.setHours(23, 59, 59, 999);

    const newFilter = { dataInicial: inicio, dataFinal: fim, isActive: true };
    setActiveFilter(newFilter);
    onFilterChange(newFilter);
    localStorage.setItem("dateFilter", JSON.stringify(newFilter));
    setIsOpen(false);
  };

  const handleDataEspecifica = () => {
    if (!dataEspecifica) {
      alert("Selecione uma data");
      return;
    }

    const data = new Date(dataEspecifica);
    data.setHours(0, 0, 0, 0);
    const dataFim = new Date(data);
    dataFim.setHours(23, 59, 59, 999);

    const newFilter = { dataInicial: data, dataFinal: dataFim, isActive: true };
    setActiveFilter(newFilter);
    onFilterChange(newFilter);
    localStorage.setItem("dateFilter", JSON.stringify(newFilter));
    setIsOpen(false);
  };

  const handleLimpar = () => {
    setActiveFilter({ isActive: false });
    onFilterChange({ isActive: false });
    localStorage.removeItem("dateFilter");
    setDataInicial("");
    setDataFinal("");
    setDataEspecifica("");
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="border-cyan-500/50 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all duration-300 gap-2"
          >
            <Calendar className="w-4 h-4" />
            Filtro de Data
          </Button>

          {isOpen && (
            <Card className="absolute top-full left-0 mt-2 w-80 bg-slate-800/95 border-cyan-500/30 p-4 z-50 shadow-2xl">
              <div className="space-y-4">
                {/* Abas */}
                <div className="flex gap-2 border-b border-slate-700">
                  <button
                    onClick={() => setFilterType("atalho")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "atalho"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Atalhos
                  </button>
                  <button
                    onClick={() => setFilterType("personalizado")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "personalizado"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Período
                  </button>
                  <button
                    onClick={() => setFilterType("especifico")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "especifico"
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Data
                  </button>
                </div>

                {/* Atalhos Rápidos */}
                {filterType === "atalho" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAtalhoRapido("hoje")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("7dias")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Últimos 7 dias
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("30dias")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Últimos 30 dias
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("mes")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Este mês
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("mespassado")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Mês passado
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("ano")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700/50 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Este ano
                    </button>
                  </div>
                )}

                {/* Período Personalizado */}
                {filterType === "personalizado" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Data Inicial</label>
                      <Input
                        type="date"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Data Final</label>
                      <Input
                        type="date"
                        value={dataFinal}
                        onChange={(e) => setDataFinal(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </div>
                    <Button
                      onClick={handlePeriodoPersonalizado}
                      size="sm"
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Aplicar
                    </Button>
                  </div>
                )}

                {/* Data Específica */}
                {filterType === "especifico" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Selecione a Data</label>
                      <Input
                        type="date"
                        value={dataEspecifica}
                        onChange={(e) => setDataEspecifica(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-slate-100"
                      />
                    </div>
                    <Button
                      onClick={handleDataEspecifica}
                      size="sm"
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Badge de Filtro Ativo */}
        {activeFilter.isActive && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-sm">
            <span>
              {formatDate(activeFilter.dataInicial)} - {formatDate(activeFilter.dataFinal)}
            </span>
            <button
              onClick={handleLimpar}
              className="hover:text-cyan-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
