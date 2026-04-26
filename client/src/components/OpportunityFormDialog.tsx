import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OpportunityFormDialogProps {
  opportunity?: any;
  defaultContactId?: number;
  defaultPipelineId?: number;
  defaultStageId?: number;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function OpportunityFormDialog({ 
  opportunity, 
  defaultContactId, 
  defaultPipelineId, 
  defaultStageId, 
  onSuccess, 
  trigger 
}: OpportunityFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: opportunity?.title || "",
    contactId: opportunity?.contactId?.toString() || defaultContactId?.toString() || "",
    pipelineId: opportunity?.pipelineId?.toString() || defaultPipelineId?.toString() || "",
    stageId: opportunity?.stageId?.toString() || defaultStageId?.toString() || "",
    monetaryValue: opportunity?.monetaryValue || "",
    segment: opportunity?.segment || "",
    source: opportunity?.source || "",
    notes: opportunity?.notes || "",
  });

  // Data fetching
  const { data: contacts } = trpc.contacts.list.useQuery();
  const { data: pipelines } = trpc.pipelines.list.useQuery();
  
  const createMutation = trpc.opportunities.create.useMutation();
  const updateMutation = trpc.opportunities.update.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open && !opportunity) {
      // Auto-select first pipeline and its first stage if not provided
      let initialPipelineId = defaultPipelineId?.toString() || "";
      let initialStageId = defaultStageId?.toString() || "";

      if (!initialPipelineId && pipelines && pipelines.length > 0) {
        initialPipelineId = pipelines[0].id.toString();
        if (pipelines[0].stages && pipelines[0].stages.length > 0) {
          initialStageId = pipelines[0].stages[0].id.toString();
        }
      }

      setFormData({
        title: "", 
        contactId: defaultContactId?.toString() || "", 
        pipelineId: initialPipelineId, 
        stageId: initialStageId, 
        monetaryValue: "", 
        segment: "", 
        source: "", 
        notes: "",
      });
    }
  }, [open, opportunity, pipelines, defaultContactId, defaultPipelineId, defaultStageId]);

  // Find currently selected pipeline to get its stages
  const selectedPipeline = pipelines?.find(p => p.id.toString() === formData.pipelineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contactId || !formData.pipelineId || !formData.stageId) {
      toast.error("Por favor, selecione Contato, Pipeline e Estágio.");
      return;
    }

    try {
      const payload: any = {
        ...formData,
        contactId: parseInt(formData.contactId),
        pipelineId: parseInt(formData.pipelineId),
        stageId: parseInt(formData.stageId),
      };

      if (payload.monetaryValue === "") {
        payload.monetaryValue = null;
      }

      if (opportunity?.id) {
        await updateMutation.mutateAsync({ id: opportunity.id, ...payload });
        toast.success("Oportunidade atualizada!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Oportunidade criada!");
      }
      setOpen(false);
      onSuccess?.();
      // Invalidar cache em background
      utils.opportunities.list.invalidate();
      utils.opportunities.stats.invalidate();
    } catch (error: any) {
      toast.error(`Erro ao salvar oportunidade: ${error.message || error}`);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Briefcase className="w-4 h-4 mr-2" />
            {opportunity ? "Editar" : "Nova Oportunidade"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {opportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {opportunity ? "Atualize os dados do negócio" : "Cadastre uma nova oportunidade de venda"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          
          <div>
            <Label className="text-slate-300">Título / Nome do Negócio *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
              placeholder="Ex: Consultoria XYZ"
            />
          </div>

          <div>
            <Label className="text-slate-300">Contato Vinculado *</Label>
            <Select 
              value={formData.contactId} 
              onValueChange={(val) => setFormData({ ...formData, contactId: val })}
              disabled={!!defaultContactId} // Se veio preenchido, trava
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 mt-1">
                <SelectValue placeholder="Selecione o contato..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                {contacts?.map(contact => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>
                    {contact.name} {contact.company ? `(${contact.company})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Funil (Pipeline) *</Label>
              <Select 
                value={formData.pipelineId} 
                onValueChange={(val) => {
                  setFormData({ ...formData, pipelineId: val, stageId: "" }); // Reseta estágio ao trocar funil
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                  {pipelines?.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Estágio *</Label>
              <Select 
                value={formData.stageId} 
                onValueChange={(val) => setFormData({ ...formData, stageId: val })}
                disabled={!formData.pipelineId}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                  {selectedPipeline?.stages?.map((stage: any) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Valor Esperado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monetaryValue}
                onChange={(e) => setFormData({ ...formData, monetaryValue: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-slate-300">Origem</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="Google, Evento, etc"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Observações da Oportunidade</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800 border-slate-600 text-slate-100 mt-1 h-20 resize-y"
              placeholder="Detalhes sobre este negócio..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}
              className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading ? "Salvando..." : opportunity ? "Atualizar" : "Criar Oportunidade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
