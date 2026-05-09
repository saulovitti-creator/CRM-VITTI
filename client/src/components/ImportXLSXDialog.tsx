import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, AlertCircle, CheckCircle, AlertTriangle, Download, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ── Types ──
interface SpreadsheetRow {
  "Nome"?: string;
  "Empresa"?: string;
  "Telefone"?: string;
  "Email"?: string;
  "Segmento"?: string;
  "Cidade"?: string;
  "Nome da Oportunidade"?: string;
  "Pipeline"?: string;
  "Estágio Inicial"?: string;
  "Valor Estimado"?: string;
  "Origem"?: string;
  "Tags"?: string;
  "Observações"?: string;
}

interface MappedRow {
  nome?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  segmento?: string;
  cidade?: string;
  nomeDaOportunidade?: string;
  pipeline?: string;
  estagioInicial?: string;
  valorEstimado?: string;
  origem?: string;
  tags?: string;
  observacoes?: string;
}

type ImportMode = "contacts_only" | "contacts_and_opportunities";
type WizardStep = "upload" | "preview" | "importing" | "report";

// ── Map spreadsheet columns to backend fields ──
function mapRow(row: SpreadsheetRow): MappedRow {
  return {
    nome: row["Nome"] || undefined,
    empresa: row["Empresa"] || undefined,
    telefone: row["Telefone"] != null ? String(row["Telefone"]) : undefined,
    email: row["Email"] || undefined,
    segmento: row["Segmento"] || undefined,
    cidade: row["Cidade"] || undefined,
    nomeDaOportunidade: row["Nome da Oportunidade"] || undefined,
    pipeline: row["Pipeline"] || undefined,
    estagioInicial: row["Estágio Inicial"] || undefined,
    valorEstimado: row["Valor Estimado"] != null ? String(row["Valor Estimado"]) : undefined,
    origem: row["Origem"] || undefined,
    tags: row["Tags"] || undefined,
    observacoes: row["Observações"] || undefined,
  };
}

// ── Pre-validation (client-side, lightweight) ──
interface PreValidation {
  totalRows: number;
  emptyRows: number;
  validRows: number;
  rowsWithIssues: number;
  missingIdentification: number;
  missingContact: number;
  missingPipeline: number;
}

function preValidate(rows: MappedRow[], mode: ImportMode): PreValidation {
  let emptyRows = 0;
  let validRows = 0;
  let missingIdentification = 0;
  let missingContact = 0;
  let missingPipeline = 0;

  for (const row of rows) {
    const allEmpty = Object.values(row).every(v => !v || v.trim() === "");
    if (allEmpty) { emptyRows++; continue; }

    let hasIssue = false;
    if (!row.nome?.trim() && !row.empresa?.trim()) { missingIdentification++; hasIssue = true; }
    if (!row.telefone?.trim() && !row.email?.trim()) { missingContact++; hasIssue = true; }
    if (mode === "contacts_and_opportunities" && !row.pipeline?.trim()) { missingPipeline++; hasIssue = true; }

    if (!hasIssue) validRows++;
  }

  return {
    totalRows: rows.length,
    emptyRows,
    validRows,
    rowsWithIssues: missingIdentification + missingContact + missingPipeline,
    missingIdentification,
    missingContact,
    missingPipeline,
  };
}

// ── Main Component ──
export function ImportXLSXDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [mode, setMode] = useState<ImportMode>("contacts_and_opportunities");
  const [rawRows, setRawRows] = useState<MappedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImport = trpc.import.bulkImport.useMutation();
  const utils = trpc.useUtils();

  const validation = useMemo(() => preValidate(rawRows, mode), [rawRows, mode]);

  // ── Reset state ──
  const resetWizard = () => {
    setStep("upload");
    setMode("contacts_and_opportunities");
    setRawRows([]);
    setFileName("");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Step 1: File Upload ──
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet);

      if (data.length === 0) {
        toast.error("A planilha está vazia.");
        return;
      }

      setRawRows(data.map(mapRow));
      setFileName(file.name);
      setStep("preview");
    } catch (error) {
      console.error("Erro ao ler planilha:", error);
      toast.error("Erro ao ler o arquivo. Verifique se é um XLSX válido.");
    }
  };

  // ── Step 3: Execute Import ──
  const handleConfirmImport = async () => {
    setStep("importing");

    try {
      const result = await bulkImport.mutateAsync({
        mode,
        rows: rawRows,
      });

      setImportResult(result);
      setStep("report");

      // Invalidate caches
      await utils.contacts.list.invalidate();
      await utils.opportunities.list.invalidate();
      await utils.dashboard.stats.invalidate();

      if (result.summary.linesWithError === 0) {
        toast.success(`Importação concluída! ${result.summary.contactsCreated + result.summary.contactsReused} contatos, ${result.summary.opportunitiesCreated} oportunidades.`);
      } else {
        toast.warning(`Importação parcial: ${result.summary.linesWithError} linha(s) com erro.`);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro na importação.");
      setStep("preview");
    }
  };

  // ── Download Error Report ──
  const handleDownloadReport = () => {
    if (!importResult) return;

    const reportData = importResult.results.map((r: any) => ({
      "Linha": r.rowIndex,
      "Status": r.status === "success" ? "Importado" : r.status === "error" ? "Erro" : "Ignorado",
      "Contato Criado": r.contactCreated ? "Sim" : r.contactId ? "Reutilizado" : "-",
      "Oportunidade ID": r.opportunityId || "-",
      "Erros": r.errors.join("; ") || "-",
      "Alertas": r.alerts.join("; ") || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws["!cols"] = [
      { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 50 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "relatorio-importacao-crm-vitti.xlsx");
    toast.success("Relatório baixado!");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetWizard(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar Planilha"}
            {step === "preview" && "Pré-validação"}
            {step === "importing" && "Importando..."}
            {step === "report" && "Relatório da Importação"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Escolha o modo de importação e suba sua planilha XLSX."}
            {step === "preview" && `Arquivo: ${fileName} — Revise antes de confirmar.`}
            {step === "importing" && "Processando sua planilha no servidor..."}
            {step === "report" && "Veja o resultado detalhado da importação."}
          </DialogDescription>
        </DialogHeader>

        {/* ════════════════════ STEP 1: UPLOAD ════════════════════ */}
        {step === "upload" && (
          <div className="space-y-6 py-4">
            {/* Mode Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Modo de importação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode("contacts_only")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    mode === "contacts_only"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <p className="font-medium text-sm">Apenas Contatos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Popula a base cadastral. Nenhuma oportunidade será criada.
                  </p>
                </button>
                <button
                  onClick={() => setMode("contacts_and_opportunities")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    mode === "contacts_and_opportunities"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <p className="font-medium text-sm">Contatos + Oportunidades</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cria contatos e insere oportunidades no kanban automaticamente.
                  </p>
                  <span className="text-[10px] text-primary font-semibold mt-1 inline-block">RECOMENDADO</span>
                </button>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Arquivo XLSX</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/10 file:text-primary
                  hover:file:bg-primary/20
                  cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Use o template oficial do CRM Vitti para melhores resultados.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════ STEP 2: PREVIEW ════════════════════ */}
        {step === "preview" && (
          <div className="space-y-5 py-4">
            {/* Mode Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {mode === "contacts_only" ? "Apenas Contatos" : "Contatos + Oportunidades"}
              </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{validation.totalRows}</p>
                <p className="text-xs text-muted-foreground">Linhas lidas</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{validation.validRows}</p>
                <p className="text-xs text-muted-foreground">Válidas</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{validation.rowsWithIssues}</p>
                <p className="text-xs text-muted-foreground">Com erro</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{validation.emptyRows}</p>
                <p className="text-xs text-muted-foreground">Vazias (ignoradas)</p>
              </div>
            </div>

            {/* Issue Details */}
            {validation.rowsWithIssues > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Problemas detectados
                </p>
                {validation.missingIdentification > 0 && (
                  <p className="text-xs text-red-300">• {validation.missingIdentification} linha(s) sem Nome nem Empresa</p>
                )}
                {validation.missingContact > 0 && (
                  <p className="text-xs text-red-300">• {validation.missingContact} linha(s) sem Telefone nem Email</p>
                )}
                {validation.missingPipeline > 0 && (
                  <p className="text-xs text-red-300">• {validation.missingPipeline} linha(s) sem Pipeline (obrigatório neste modo)</p>
                )}
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                A validação completa (pipelines, estágios, duplicatas, tags) será feita no servidor ao confirmar.
                Linhas com erro serão rejeitadas individualmente sem afetar as demais.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={validation.validRows === 0}
              >
                Confirmar Importação <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════ STEP 3: IMPORTING ════════════════════ */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Processando {rawRows.length} linhas no servidor...
            </p>
            <p className="text-xs text-muted-foreground">
              Isso pode levar alguns segundos para lotes grandes.
            </p>
          </div>
        )}

        {/* ════════════════════ STEP 4: REPORT ════════════════════ */}
        {step === "report" && importResult && (
          <div className="space-y-5 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{importResult.summary.contactsCreated}</p>
                <p className="text-xs text-muted-foreground">Contatos criados</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{importResult.summary.contactsReused}</p>
                <p className="text-xs text-muted-foreground">Contatos reutilizados</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{importResult.summary.opportunitiesCreated}</p>
                <p className="text-xs text-muted-foreground">Oportunidades criadas</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{importResult.summary.linesWithError}</p>
                <p className="text-xs text-muted-foreground">Linhas com erro</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{importResult.summary.tagsIgnored}</p>
                <p className="text-xs text-muted-foreground">Tags ignoradas</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{importResult.summary.linesSkipped}</p>
                <p className="text-xs text-muted-foreground">Linhas vazias</p>
              </div>
            </div>

            {/* Detailed Results (scrollable) */}
            {importResult.results.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Linha</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.results.map((r: any, idx: number) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">{r.rowIndex}</td>
                        <td className="px-3 py-2">
                          {r.status === "success" ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400">
                              <AlertCircle className="w-3 h-3" /> Erro
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.errors.length > 0 && <span className="text-red-400">{r.errors.join("; ")} </span>}
                          {r.alerts.length > 0 && <span className="text-yellow-400">{r.alerts.join("; ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="w-4 h-4 mr-1" /> Baixar Relatório
              </Button>
              <Button size="sm" onClick={() => { resetWizard(); setOpen(false); }}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
