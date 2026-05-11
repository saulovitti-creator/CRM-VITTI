import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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
import { CurrencyInput } from "./ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveFunnelStages } from "@/hooks/useActiveFunnelStages";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

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
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<"won" | "lost" | "abandoned" | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
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
  
  // Dynamic Funnel Stages Hook
  const { stages: activeStages, isLoading: loadingStages, error: stagesError } = useActiveFunnelStages({
    type: "opportunity",
    pipelineId: formData.pipelineId,
    currentStatusOrId: opportunity?.stageId,
  });

  const createMutation = trpc.opportunities.create.useMutation();
  const updateMutation = trpc.opportunities.update.useMutation();
  const deleteMutation = trpc.opportunities.delete.useMutation();
  const setOutcomeMutation = trpc.opportunities.setOutcome.useMutation();
  const saveCustomValuesMutation = trpc.customFields.setValues.useMutation();
  const utils = trpc.useUtils();

  // Custom Fields State
  const [customValues, setCustomValues] = useState<Record<number, string | null>>({});

  const { data: customFields } = trpc.customFields.listDefinitions.useQuery(
    { model: "opportunity" },
    { enabled: open }
  );

  const { data: existingValues } = trpc.customFields.getValues.useQuery(
    { entityId: opportunity?.id as number, entityType: "opportunity" },
    { enabled: open && !!opportunity?.id }
  );

  useEffect(() => {
    if (existingValues) {
      const vals: Record<number, string | null> = {};
      existingValues.forEach((v: any) => vals[v.definitionId] = v.value);
      setCustomValues(vals);
    } else if (!opportunity) {
      setCustomValues({});
    }
  }, [existingValues, opportunity, open]);

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

  // Find currently selected pipeline to get its stages (kept for other logic if needed, or can be removed if activeStages replaces it everywhere)
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

      const queryKeyArgs = { pipelineId: payload.pipelineId };

      if (opportunity?.id) {
        // Optimistic update
        utils.opportunities.list.setData(queryKeyArgs, (old: any) => {
          if (!old) return old;
          return old.map((o: any) => o.id === opportunity.id ? { ...o, ...payload } : o);
        });

        updateMutation.mutateAsync({ id: opportunity.id, ...payload }).then(async () => {
          if (Object.keys(customValues).length > 0) {
            await saveCustomValuesMutation.mutateAsync({
              entityId: opportunity.id,
              entityType: "opportunity",
              values: Object.entries(customValues).map(([k, v]) => ({
                definitionId: parseInt(k),
                value: v,
              })),
            });
          }
          toast.success("Oportunidade atualizada!");
          utils.opportunities.list.invalidate();
          utils.opportunities.closedList.invalidate();
          utils.opportunities.stats.invalidate();
          utils.customFields.getValues.invalidate({ entityId: opportunity.id, entityType: "opportunity" });
        }).catch((error: any) => {
          toast.error(`Erro ao salvar oportunidade: ${error.message || error}`);
          utils.opportunities.list.invalidate();
          utils.opportunities.closedList.invalidate();
        });
      } else {
        createMutation.mutateAsync(payload).then(async (newOpp) => {
          if (Object.keys(customValues).length > 0) {
            await saveCustomValuesMutation.mutateAsync({
              entityId: newOpp.id,
              entityType: "opportunity",
              values: Object.entries(customValues).map(([k, v]) => ({
                definitionId: parseInt(k),
                value: v,
              })),
            });
          }
          toast.success("Oportunidade criada!");
          utils.opportunities.list.invalidate();
          utils.opportunities.closedList.invalidate();
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

  const openOutcomeDialog = (outcome: "won" | "lost" | "abandoned") => {
    setPendingOutcome(outcome);
    setOutcomeReason("");
    setOutcomeDialogOpen(true);
  };

  const cancelOutcomeDialog = () => {
    setOutcomeDialogOpen(false);
    setPendingOutcome(null);
    setOutcomeReason("");
    toast.info("Ação cancelada.");
  };

  const closeWithOutcome = async () => {
    if (!opportunity?.id) return;
    if (!pendingOutcome) return;
    if (opportunity?.status && opportunity.status !== "open") {
      toast.info("Esta oportunidade ja esta finalizada.");
      return;
    }

    const normalizedReason = outcomeReason.trim();
    if (!normalizedReason) {
      toast.error("Informe uma justificativa para concluir o desfecho.");
      return;
    }

    try {
      console.log("[setOutcome] payload", {
        id: opportunity.id,
        outcome: pendingOutcome,
        reason: normalizedReason,
      });

      await setOutcomeMutation.mutateAsync({
        opportunityId: opportunity.id,
        outcome: pendingOutcome,
        reason: normalizedReason,
      });

      if (pendingOutcome === "won") toast.success("Oportunidade marcada como ganha.");
      if (pendingOutcome === "lost") toast.success("Oportunidade marcada como perdida.");
      if (pendingOutcome === "abandoned") toast.success("Oportunidade marcada como abandonada.");

      const pipelineId = opportunity.pipelineId as number | undefined;
      if (pipelineId) {
        utils.opportunities.list.setData({ pipelineId, status: "open" }, (old: any) =>
          old?.filter((opp: any) => opp.id !== opportunity.id)
        );
        utils.opportunities.list.setData({ pipelineId }, (old: any) =>
          old?.filter((opp: any) => opp.id !== opportunity.id)
        );
      }

      await Promise.all([
        pipelineId
          ? utils.opportunities.list.invalidate({ pipelineId, status: "open" })
          : utils.opportunities.list.invalidate(),
        pipelineId
          ? utils.opportunities.list.invalidate({ pipelineId })
          : utils.opportunities.list.invalidate(),
        utils.opportunities.list.invalidate(),
        utils.opportunities.closedList.invalidate(),
        utils.opportunities.stats.invalidate(),
        utils.dashboard.stats.invalidate(),
        utils.dashboard.followUpAlerts.invalidate(),
        utils.opportunities.getById.invalidate({ id: opportunity.id }),
      ]);
      setOutcomeDialogOpen(false);
      setPendingOutcome(null);
      setOutcomeReason("");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[setOutcome] failed", {
        opportunityId: opportunity.id,
        outcome: pendingOutcome,
        error,
      });
      toast.error(`Erro ao finalizar oportunidade: ${error.message || error}`);
    }
  };

  return (
    <>
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
            {opportunity ? "Atualize os dados do negócio" : "Cadastre uma nova oportunidade de venda"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          
          <div>
            <Label className="text-foreground">Título / Nome do Negócio *</Label>
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
                  setFormData({ ...formData, pipelineId: val, stageId: "" }); // Reseta estágio ao trocar funil
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
              <Label className="text-foreground">Estágio *</Label>
              <Select 
                value={formData.stageId} 
                onValueChange={(val) => setFormData({ ...formData, stageId: val })}
                disabled={!formData.pipelineId || loadingStages}
              >
                <SelectTrigger className=" mt-1">
                  <SelectValue placeholder={loadingStages ? "Carregando..." : "Selecione..."} />
                </SelectTrigger>
                <SelectContent className="">
                  {activeStages.length === 0 && !loadingStages && (
                    <SelectItem value="_empty" disabled>
                      Nenhum estágio disponível
                    </SelectItem>
                  )}
                  {activeStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stagesError && (
                <p className="text-xs text-red-500 mt-1">Erro ao carregar estágios.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Valor Esperado (R$)</Label>
              <CurrencyInput
                value={formData.monetaryValue}
                onValueChange={(val) => setFormData({ ...formData, monetaryValue: val })}
                className="mt-1"
                placeholder="R$ 0,00"
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

          {/* Custom Fields (Renderizados Dinamicamente) */}
          {customFields && customFields.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg border border-border/50 space-y-4 my-4">
              <h4 className="text-sm font-semibold text-primary border-b border-border pb-2">Informações Adicionais</h4>
              
              {/* Agrupamento por GroupName */}
              {(() => {
                const groups: Record<string, typeof customFields> = {};
                customFields.forEach(field => {
                  const g = field.groupName || "Gerais";
                  if (!groups[g]) groups[g] = [];
                  groups[g].push(field);
                });

                return Object.entries(groups).map(([groupName, fields]) => (
                  <div key={groupName} className="space-y-3">
                    {groupName !== "Gerais" && (
                      <h5 className="text-xs font-medium text-muted-foreground mt-4 uppercase">{groupName}</h5>
                    )}
                    {fields.map(field => (
                      <DynamicFieldRenderer
                        key={field.id}
                        definition={field}
                        value={customValues[field.id] || null}
                        onChange={(val) => setCustomValues(prev => ({ ...prev, [field.id]: val }))}
                      />
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}

          <div>
            <Label className="text-foreground">Observações da Oportunidade</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className=" mt-1 h-20 resize-y"
              placeholder="Detalhes sobre este negócio..."
            />
          </div>

          <div className="flex justify-between items-start pt-2">
            <div>
              {opportunity && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => openOutcomeDialog("won")}
                      disabled={setOutcomeMutation.isPending || opportunity?.status !== "open"}
                    >
                      Marcar como Ganho
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-amber-600 text-amber-700 hover:bg-amber-50"
                      onClick={() => openOutcomeDialog("lost")}
                      disabled={setOutcomeMutation.isPending || opportunity?.status !== "open"}
                    >
                      Marcar como Perdido
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-violet-600 text-violet-700 hover:bg-violet-50"
                      onClick={() => openOutcomeDialog("abandoned")}
                      disabled={setOutcomeMutation.isPending || opportunity?.status !== "open"}
                    >
                      Marcar como Abandonado
                    </Button>
                  </div>

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
                        Esta ação não pode ser desfeita. Isto excluirá permanentemente a oportunidade e os dados associados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted hover:text-white">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async () => {
                          try {
                            await deleteMutation.mutateAsync({ id: opportunity.id });
                            utils.opportunities.list.invalidate();
          utils.opportunities.closedList.invalidate();
                            toast.success("Oportunidade excluída com sucesso");
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
                </div>
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

    <Dialog open={outcomeDialogOpen}>
      <DialogContent
        className="max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Registrar desfecho</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informe a justificativa para concluir este desfecho comercial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-foreground">Justificativa *</Label>
          <Textarea
            value={outcomeReason}
            onChange={(e) => setOutcomeReason(e.target.value)}
            className="mt-1 h-24 resize-y"
            placeholder="Descreva o motivo deste desfecho..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-border text-foreground"
            onClick={cancelOutcomeDialog}
            disabled={setOutcomeMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="text-white"
            onClick={closeWithOutcome}
            disabled={setOutcomeMutation.isPending}
          >
            {setOutcomeMutation.isPending ? "Registrando..." : "Confirmar desfecho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}


