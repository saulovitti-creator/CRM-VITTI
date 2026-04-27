import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const deleteMutation = trpc.opportunities.delete.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open) {
      if (opportunity) {
        setFormData({
          title: opportunity.title || "",
          contactId: opportunity.contactId?.toString() || defaultContactId?.toString() || "",
          pipelineId: opportunity.pipelineId?.toString() || defaultPipelineId?.toString() || "",
          stageId: opportunity.stageId?.toString() || defaultStageId?.toString() || "",
          monetaryValue: opportunity.monetaryValue || "",
          segment: opportunity.segment || "",
          source: opportunity.source || "",
          notes: opportunity.notes || "",
        });
      } else {
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
    }
  }, [open, opportunity, pipelines, defaultContactId, defaultPipelineId, defaultStageId]);

  // Find currently selected pipeline to get its stages
  const selectedPipeline = pipelines?.find(p => p.id.toString() === formData.pipelineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contactId || !formData.pipelineId || !formData.stageId) {
      toast.error("Por favor, selecione Contato, Pipeline e EstÃ¡gio.");
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

      const queryKeyArgs = { pipelineId: payload.pipelineId };

      if (opportunity?.id) {
        // Optimistic update
        utils.opportunities.list.setData(queryKeyArgs, (old: any) => {
          if (!old) return old;
          return old.map((o: any) => o.id === opportunity.id ? { ...o, ...payload } : o);
        });

        updateMutation.mutateAsync({ id: opportunity.id, ...payload }).then(() => {
          toast.success("Oportunidade atualizada!");
          utils.opportunities.list.invalidate();
          utils.opportunities.stats.invalidate();
        }).catch((error: any) => {
          toast.error(`Erro ao salvar oportunidade: ${error.message || error}`);
          utils.opportunities.list.invalidate();
        });
      } else {
        createMutation.mutateAsync(payload).then(() => {
          toast.success("Oportunidade criada!");
          utils.opportunities.list.invalidate();
          utils.opportunities.stats.invalidate();
        }).catch((error: any) => {
          toast.error(`Erro ao salvar oportunidade: ${error.message || error}`);
        });
      }
      
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Erro inesperado: ${error.message || error}`);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="">
            <Briefcase className="w-4 h-4 mr-2" />
            {opportunity ? "Editar" : "Nova Oportunidade"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg ">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {opportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {opportunity ? "Atualize os dados do negÃ³cio" : "Cadastre uma nova oportunidade de venda"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          
          <div>
            <Label className="text-foreground">TÃ­tulo / Nome do NegÃ³cio *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className=" mt-1"
              placeholder="Ex: Consultoria XYZ"
            />
          </div>

          <div>
            <Label className="text-foreground">Contato Vinculado *</Label>
            <Select 
              value={formData.contactId} 
              onValueChange={(val) => setFormData({ ...formData, contactId: val })}
              disabled={!!defaultContactId} // Se veio preenchido, trava
            >
              <SelectTrigger className=" mt-1">
                <SelectValue placeholder="Selecione o contato..." />
              </SelectTrigger>
              <SelectContent className="">
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
              <Label className="text-foreground">Funil (Pipeline) *</Label>
              <Select 
                value={formData.pipelineId} 
                onValueChange={(val) => {
                  setFormData({ ...formData, pipelineId: val, stageId: "" }); // Reseta estÃ¡gio ao trocar funil
                }}
              >
                <SelectTrigger className=" mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="">
                  {pipelines?.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">EstÃ¡gio *</Label>
              <Select 
                value={formData.stageId} 
                onValueChange={(val) => setFormData({ ...formData, stageId: val })}
                disabled={!formData.pipelineId}
              >
                <SelectTrigger className=" mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="">
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
              <Label className="text-foreground">Valor Esperado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monetaryValue}
                onChange={(e) => setFormData({ ...formData, monetaryValue: e.target.value })}
                className=" mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-foreground">Origem</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className=" mt-1"
                placeholder="Google, Evento, etc"
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground">ObservaÃ§Ãµes da Oportunidade</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className=" mt-1 h-20 resize-y"
              placeholder="Detalhes sobre este negÃ³cio..."
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              {opportunity && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Excluir oportunidade?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        Esta aÃ§Ã£o nÃ£o pode ser desfeita. Isto excluirÃ¡ permanentemente a oportunidade e os dados associados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted hover:text-white">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async () => {
                          try {
                            await deleteMutation.mutateAsync({ id: opportunity.id });
                            utils.opportunities.list.invalidate();
                            toast.success("Oportunidade excluÃ­da com sucesso");
                            setOpen(false);
                            if (onSuccess) onSuccess();
                          } catch (error: any) {
                            toast.error("Erro ao excluir: " + error.message);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                className="border-border text-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}
                className=" text-white">
                {isLoading ? "Salvando..." : opportunity ? "Atualizar" : "Criar Oportunidade"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
