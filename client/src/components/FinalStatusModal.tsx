import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface FinalStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  leadName: string;
  status: "Perdido" | "Abandonado" | "Ganho";
  onSuccess?: () => void;
}

export function FinalStatusModal({
  open,
  onOpenChange,
  leadId,
  leadName,
  status,
  onSuccess,
}: FinalStatusModalProps) {
  const [valorFechado, setValorFechado] = useState("");
  const [motivoSaida, setMotivoSaida] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const moveToFinalStatus = trpc.leads.moveToFinalStatus.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de justificativa obrigatória
    if (!motivoSaida.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    if (motivoSaida.trim().length < 10) {
      toast.error("Justificativa deve ter no mínimo 10 caracteres");
      return;
    }

    // Validação de valor fechado
    if (status === "Ganho" && !valorFechado) {
      toast.error("Valor fechado é obrigatório para status Ganho");
      return;
    }

    if (status === "Ganho") {
      const valor = parseFloat(valorFechado);
      if (isNaN(valor) || valor <= 0) {
        toast.error("Valor fechado deve ser um número positivo");
        return;
      }
    }

    setIsLoading(true);

    try {
      await moveToFinalStatus.mutateAsync({
        id: leadId,
        status,
        valorFechado: status === "Ganho" ? parseFloat(valorFechado) : undefined,
        motivoSaida: motivoSaida || undefined,
      });

      toast.success(`Lead movido para ${status} com sucesso!`);
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();

      setValorFechado("");
      setMotivoSaida("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao mover lead para status final");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = () => {
    if (status === "Perdido") return "Perdido";
    if (status === "Abandonado") return "Abandonado";
    return "Ganho";
  };

  const getStatusColor = () => {
    if (status === "Perdido") return "text-red-500";
    if (status === "Abandonado") return "text-gray-500";
    return "text-green-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={getStatusColor()}>
            Mover para {getStatusLabel()}
          </DialogTitle>
          <DialogDescription>
            {leadName} - {status}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {status === "Ganho" && (
            <div className="space-y-2">
              <Label htmlFor="valorFechado">
                Valor Fechado <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">R$</span>
                <Input
                  id="valorFechado"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valorFechado}
                  onChange={(e) => setValorFechado(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivoSaida">
              Justificativa <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivoSaida"
              placeholder="Descreva a justificativa da saída do funil (mínimo 10 caracteres)..."
              value={motivoSaida}
              onChange={(e) => setMotivoSaida(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400">
              {motivoSaida.length}/10 caracteres mínimos
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                status === "Ganho"
                  ? "bg-green-600 hover:bg-green-700"
                  : status === "Perdido"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }
            >
              {isLoading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
