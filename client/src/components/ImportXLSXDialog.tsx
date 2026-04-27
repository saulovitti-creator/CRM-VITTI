import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { LEAD_CATEGORIES } from "@shared/types";
import { ErrorList, generateErrorMessage, ImportError } from "@/components/ErrorAlert";

interface ImportedLead {
  "Empresa *": string;
  "Contato"?: string;
  "Telefone *": string;
  "Email"?: string;
  "Segmento *": string;
  "Status"?: string;
  "Site"?: string;
  "Cidade"?: string;
  "Notas"?: string;
}

interface ProcessedLead {
  companyName: string;
  contactName?: string;
  phone: string;
  email?: string;
  segment: string;
  status?: string;
  site?: string;
  city?: string;
  notes?: string;
}

interface ImportResult {
  rowIndex: number;
  company: string;
  status: string;
  error?: string;
}

interface ImportXLSXDialogProps {
  leadType: "CRM" | "Site";
}

export function ImportXLSXDialog({ leadType }: ImportXLSXDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addError = (errorType: string, details?: any) => {
    const errorData = generateErrorMessage(errorType, details);
    const newError: ImportError = {
      id: `${Date.now()}-${Math.random()}`,
      ...errorData,
    };
    setErrors((prev) => [...prev, newError]);
  };

  const dismissError = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  const importMutation = trpc.leads.importLeads.useMutation();
  const utils = trpc.useUtils();

  const validateRow = (row: ImportedLead, rowNum: number): string | null => {
    // Validar campos obrigatórios
    if (!row["Empresa *"]?.trim()) {
      return `Linha ${rowNum}: Campo "Empresa" é obrigatório`;
    }

    // Converter telefone para string se for número
    const phone = String(row["Telefone *"] || "").trim();
    if (!phone) {
      return `Linha ${rowNum}: Campo "Telefone" é obrigatório`;
    }

    if (!row["Segmento *"]?.trim()) {
      return `Linha ${rowNum}: Campo "Segmento" é obrigatório`;
    }

    // Validar email se fornecido
    if (row["Email"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Email"])) {
      return `Linha ${rowNum}: Email inválido`;
    }

    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setValidationErrors([]);
      setImportResults([]);

      // Ler arquivo
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<ImportedLead>(worksheet);

      if (data.length === 0) {
        addError('EMPTY_FILE');
        setImporting(false);
        return;
      }

      // Validar dados e separar válidos de inválidos
      const validLeads: ProcessedLead[] = [];
      const errors: string[] = [];
      
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const error = validateRow(row, rowNum);

        if (error) {
          errors.push(error);
        } else {
          validLeads.push({
            companyName: row["Empresa *"].trim(),
            contactName: row["Contato"]?.trim() || undefined,
            phone: String(row["Telefone *"] || "").trim(),
            email: row["Email"]?.trim() || undefined,
            segment: row["Segmento *"].trim(),
            status: row["Status"]?.trim() || undefined,
            site: row["Site"]?.trim() || undefined,
            city: row["Cidade"]?.trim() || undefined,
            notes: row["Notas"]?.trim() || undefined,
          });
        }
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.warning(`${errors.length} erro(s) de validação encontrado(s). Importando ${validLeads.length} linha(s) válida(s)...`);
      }

      if (validLeads.length === 0) {
        toast.error("Nenhuma linha válida para importar");
        setImporting(false);
        return;
      }

      // Importar leads válidos com tipo de aba
      const result = await importMutation.mutateAsync({ leads: validLeads, type: leadType });

      setImportResults(result.results);

      // Invalidar cache
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();

      // Mostrar resultado
      if (result.successCount > 0) {
        toast.success(`${result.successCount} prospecto(s) importado(s) para ${leadType} com sucesso!`);
      }

      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} prospecto(s) falharam na importação`);
      }

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Fechar após 3 segundos
      setTimeout(() => {
        setOpen(false);
        setImportResults([]);
        setValidationErrors([]);
      }, 3000);
    } catch (error) {
      console.error("Erro ao importar:", error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addError('INVALID_FORMAT', { message: errorMessage });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Prospectos para {leadType}</DialogTitle>
          <DialogDescription>
            Selecione um arquivo XLSX com os prospectos para importar na aba <strong>{leadType}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Indicator Badge */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${leadType === 'CRM' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-purple-500/10 border-purple-500/30 text-purple-300'}`}>
            <div className={`w-3 h-3 rounded-full ${leadType === 'CRM' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
            <span className="text-sm font-medium">
              Importando para: <strong>{leadType}</strong>
            </span>
          </div>

          {/* Persistent Errors */}
          {errors.length > 0 && (
            <ErrorList errors={errors} onDismiss={dismissError} />
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
              className="hidden"
              id="xlsx-input"
            />
            <label
              htmlFor="xlsx-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {importing ? `Importando para ${leadType}...` : "Clique para selecionar arquivo"}
              </span>
              <span className="text-xs text-muted-foreground">ou arraste um arquivo XLSX</span>
            </label>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {validationErrors.length} erro(s) de validação
                </span>
              </div>
              <ul className="text-xs text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Import Results */}
          {importResults.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">
                  Resultado da Importação ({importResults.length} linha(s))
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {importResults.map((result, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {result.status === "success" ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-700">
                          Linha {result.rowIndex}: {result.company} ✓
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-red-700">
                          <div>Linha {result.rowIndex}: {result.company}</div>
                          {result.error && <div className="text-red-600 ml-2">Erro: {result.error}</div>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Campos obrigatórios:</p>
            <ul className="space-y-1">
              <li>• <strong>Empresa</strong></li>
              <li>• <strong>Telefone</strong></li>
              <li>• <strong>Segmento</strong> (Clínica, Bar, Restaurante, Empresa)</li>
            </ul>
            <p className="font-medium mt-2 mb-1">Campos opcionais:</p>
            <ul className="space-y-1">
              <li>• <strong>Contato</strong></li>
              <li>• <strong>Email</strong></li>
              <li>• <strong>Status</strong> (será "Entrar em contato" se não fornecido ou inválido)</li>
              <li>• <strong>Cidade</strong></li>
              <li>• <strong>Notas</strong></li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
