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
        onFilterChange({
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

  const parseLocalInputDate = (value: string, endOfDay = false): Date => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return date;
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

    const inicio = parseLocalInputDate(dataInicial);
    const fim = parseLocalInputDate(dataFinal, true);

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

    const data = parseLocalInputDate(dataEspecifica);
    const dataFim = parseLocalInputDate(dataEspecifica, true);

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
            className="border-primary/30 hover:bg-primary/20 hover:text-primary transition-all duration-300 gap-2"
          >
            <Calendar className="w-4 h-4" />
            Filtro de Data
          </Button>

          {isOpen && (
            <Card className="absolute top-full left-0 mt-2 w-80 bg-muted/95 border-border p-4 z-50 shadow-2xl">
              <div className="space-y-4">
                {/* Abas */}
                <div className="flex gap-2 border-b border-border">
                  <button
                    onClick={() => setFilterType("atalho")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "atalho"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Atalhos
                  </button>
                  <button
                    onClick={() => setFilterType("personalizado")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "personalizado"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Período
                  </button>
                  <button
                    onClick={() => setFilterType("especifico")}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filterType === "especifico"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
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
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("7dias")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Últimos 7 dias
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("30dias")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Últimos 30 dias
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("mes")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Este mês
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("mespassado")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Mês passado
                    </button>
                    <button
                      onClick={() => handleAtalhoRapido("ano")}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 text-foreground hover:text-primary transition-colors text-sm"
                    >
                      Este ano
                    </button>
                  </div>
                )}

                {/* Período Personalizado */}
                {filterType === "personalizado" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data Inicial</label>
                      <Input
                        type="date"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        className="bg-muted/50 border-border text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data Final</label>
                      <Input
                        type="date"
                        value={dataFinal}
                        onChange={(e) => setDataFinal(e.target.value)}
                        className="bg-muted/50 border-border text-foreground"
                      />
                    </div>
                    <Button
                      onClick={handlePeriodoPersonalizado}
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Aplicar
                    </Button>
                  </div>
                )}

                {/* Data Específica */}
                {filterType === "especifico" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Selecione a Data</label>
                      <Input
                        type="date"
                        value={dataEspecifica}
                        onChange={(e) => setDataEspecifica(e.target.value)}
                        className="bg-muted/50 border-border text-foreground"
                      />
                    </div>
                    <Button
                      onClick={handleDataEspecifica}
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm">
            <span>
              {formatDate(activeFilter.dataInicial)} - {formatDate(activeFilter.dataFinal)}
            </span>
            <button
              onClick={handleLimpar}
              className="hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
