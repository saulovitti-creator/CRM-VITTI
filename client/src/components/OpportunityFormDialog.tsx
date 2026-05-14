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
import { Briefcase } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CurrencyInput } from "./ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveFunnelStages } from "@/hooks/useActiveFunnelStages";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { parseCurrency } from "@/lib/currency";
import { ContactAutocomplete, type ContactAutocompleteOption } from "./ContactAutocomplete";

const modalDebug = (...args: unknown[]) => {
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_MODAL") === "true") {
    console.log("[OFD]", ...args);
  }
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const { data: pipelines } = trpc.pipelines.list.useQuery();
  const [selectedContact, setSelectedContact] = useState<ContactAutocompleteOption | null>(
    opportunity?.contactId
      ? {
          id: opportunity.contactId,
          name: opportunity.contactName || opportunity.contact?.name || "Contato",
          company: opportunity.contactCompany || opportunity.contact?.company || null,
          phone: opportunity.contactPhone || opportunity.contact?.phone || null,
          email: opportunity.contactEmail || opportunity.contact?.email || null,
        }
      : null
  );
  const selectedContactId = formData.contactId ? Number(formData.contactId) : null;
  const hasContactDataFromOpportunity = Boolean(
    opportunity?.contactId && (opportunity?.contactName || opportunity?.contact?.name)
  );
  const { data: selectedContactById } = trpc.contacts.getById.useQuery(
    { id: selectedContactId as number },
    {
      enabled: open && !!selectedContactId && !hasContactDataFromOpportunity,
      staleTime: 60_000,
    }
  );
  
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

  useEffect(() => {
    modalDebug("mounted", { opportunityId: opportunity?.id });
    return () => modalDebug("unmounted", { opportunityId: opportunity?.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!open) return;

    if (!formData.contactId) {
      setSelectedContact(null);
      return;
    }

    if (opportunity?.contactId && Number(formData.contactId) === Number(opportunity.contactId)) {
      setSelectedContact({
        id: Number(opportunity.contactId),
        name: opportunity.contactName || opportunity.contact?.name || "Contato",
        company: opportunity.contactCompany || opportunity.contact?.company || null,
        phone: opportunity.contactPhone || opportunity.contact?.phone || null,
        email: opportunity.contactEmail || opportunity.contact?.email || null,
      });
      return;
    }

    if (selectedContactById && Number(formData.contactId) === Number(selectedContactById.id)) {
      setSelectedContact({
        id: selectedContactById.id,
        name: selectedContactById.name,
        company: selectedContactById.company || null,
        phone: selectedContactById.phone || null,
        email: selectedContactById.email || null,
      });
    }
  }, [open, formData.contactId, opportunity, selectedContactById]);

  useEffect(() => {
    if (!open) return;
    if (opportunity?.id) {
      // Em modo de edicao, inicializa o form apenas por id da oportunidade para evitar reset
      // durante refetches de query enquanto o usuario esta digitando.
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
    }
  }, [open, opportunity?.id, defaultContactId, defaultPipelineId, defaultStageId]);

  useEffect(() => {
    if (!open || opportunity?.id) return;
    // Modo criacao: permite usar defaults e pipeline inicial.
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
  }, [open, opportunity?.id, pipelines, defaultContactId, defaultPipelineId, defaultStageId]);

  // Find currently selected pipeline to get its stages (kept for other logic if needed, or can be removed if activeStages replaces it everywhere)
  const selectedPipeline = pipelines?.find(p => p.id.toString() === formData.pipelineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!formData.contactId || !formData.pipelineId || !formData.stageId) {
        toast.error("Por favor, selecione Contato, Pipeline e Estágio.");
        return;
      }

      const payload: any = {
        ...formData,
        contactId: parseInt(formData.contactId),
        pipelineId: parseInt(formData.pipelineId),
        stageId: parseInt(formData.stageId),
        title: formData.title.trim(),
      };

      const normalizedMonetary = parseCurrency(formData.monetaryValue || "");
      if (normalizedMonetary === "") {
        payload.monetaryValue = null;
      } else {
        payload.monetaryValue = normalizedMonetary;
      }

      if (!payload.title) {
        toast.error("Informe um titulo para a oportunidade.");
        return;
      }

      const saveCustomFields = async (entityId: number) => {
        if (Object.keys(customValues).length === 0) {
          return true;
        }

        try {
          await saveCustomValuesMutation.mutateAsync({
            entityId,
            entityType: "opportunity",
            values: Object.entries(customValues).map(([k, v]) => ({
              definitionId: parseInt(k),
              value: v,
            })),
          });
          void utils.customFields.getValues.invalidate({ entityId, entityType: "opportunity" });
          return true;
        } catch (error) {
          console.error("[opportunity.customFields] failed", {
            opportunityId: entityId,
            error,
          });
          void utils.customFields.getValues.invalidate({ entityId, entityType: "opportunity" });
          toast.warning("Oportunidade salva, mas houve erro ao salvar campos personalizados.");
          return false;
        }
      };

      const previousPipelineId = opportunity?.pipelineId as number | undefined;
      const currentListKey = previousPipelineId
        ? { pipelineId: previousPipelineId, status: "open" as const }
        : { pipelineId: payload.pipelineId, status: "open" as const };
      const targetListKey = { pipelineId: payload.pipelineId, status: "open" as const };
      const currentListKeyWithoutStatus = previousPipelineId
        ? { pipelineId: previousPipelineId }
        : { pipelineId: payload.pipelineId };
      const targetListKeyWithoutStatus = { pipelineId: payload.pipelineId };
      const cacheKeys = [
        currentListKey,
        targetListKey,
        currentListKeyWithoutStatus,
        targetListKeyWithoutStatus,
      ];
      const uniqueCacheKeys = cacheKeys.filter(
        (key, index, list) =>
          list.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(key)) === index
      );
      const updateOpenOpportunityCache = (args: any, cacheOpportunity: any) => {
        if (!args) return;
        utils.opportunities.list.setData(args, (old: any) => {
          if (!old) return old;
          const shouldRemainInList =
            cacheOpportunity.status === "open" &&
            cacheOpportunity.pipelineId === args.pipelineId;

          if (!shouldRemainInList) {
            return old.filter((opp: any) => opp.id !== cacheOpportunity.id);
          }

          const exists = old.some((opp: any) => opp.id === cacheOpportunity.id);
          if (!exists) return [...old, cacheOpportunity];
          return old.map((opp: any) => (opp.id === cacheOpportunity.id ? { ...opp, ...cacheOpportunity } : opp));
        });
      };

      if (opportunity?.id) {
        await Promise.all(uniqueCacheKeys.map((key) => utils.opportunities.list.cancel(key)));
        await utils.opportunities.getById.cancel({ id: opportunity.id });
        const previousCaches = uniqueCacheKeys.map((key) => ({
          key,
          data: utils.opportunities.list.getData(key),
        }));
        const previousById = utils.opportunities.getById.getData({ id: opportunity.id });
        const pendingCacheOpportunity = {
          ...opportunity,
          ...payload,
          id: opportunity.id,
          status: opportunity.status || "open",
          contactId: payload.contactId,
          contactName: selectedContact?.name || opportunity.contactName || opportunity.contact?.name || "",
          contactCompany: selectedContact?.company || opportunity.contactCompany || opportunity.contact?.company || "",
          contactPhone: selectedContact?.phone || opportunity.contactPhone || opportunity.contact?.phone || "",
          contactEmail: selectedContact?.email || opportunity.contactEmail || opportunity.contact?.email || "",
          updatedAt: new Date(),
        };
        uniqueCacheKeys.forEach((key) => updateOpenOpportunityCache(key, pendingCacheOpportunity));
        utils.opportunities.getById.setData({ id: opportunity.id }, (old: any) =>
          old ? { ...old, ...pendingCacheOpportunity } : old
        );

        let updatedOpportunity: any;
        try {
          updatedOpportunity = await updateMutation.mutateAsync({ id: opportunity.id, ...payload });
        } catch (error) {
          previousCaches.forEach(({ key, data }) => {
            utils.opportunities.list.setData(key, data);
          });
          utils.opportunities.getById.setData({ id: opportunity.id }, previousById);
          throw error;
        }

        const updatedCacheOpportunity = {
          ...pendingCacheOpportunity,
          ...(updatedOpportunity || {}),
        };
        uniqueCacheKeys.forEach((key) => updateOpenOpportunityCache(key, updatedCacheOpportunity));
        utils.opportunities.getById.setData({ id: opportunity.id }, (old: any) =>
          old ? { ...old, ...updatedCacheOpportunity } : updatedCacheOpportunity
        );

        void saveCustomFields(opportunity.id);

        void Promise.all([
          utils.opportunities.list.invalidate({ pipelineId: payload.pipelineId, status: "open" }),
          utils.opportunities.list.invalidate({ pipelineId: payload.pipelineId }),
          utils.opportunities.list.invalidate(),
          utils.opportunities.closedList.invalidate(),
          utils.opportunities.getById.invalidate({ id: opportunity.id }),
          utils.opportunities.stats.invalidate(),
          utils.dashboard.stats.invalidate(),
          utils.dashboard.followUpAlerts.invalidate(),
          utils.customFields.getValues.invalidate({ entityId: opportunity.id, entityType: "opportunity" }),
        ]);

        toast.success("Oportunidade atualizada!");
      } else {
        const newOpp = await createMutation.mutateAsync(payload);
        void saveCustomFields(newOpp.id);

        void Promise.all([
          utils.opportunities.list.invalidate({ pipelineId: payload.pipelineId, status: "open" }),
          utils.opportunities.list.invalidate({ pipelineId: payload.pipelineId }),
          utils.opportunities.list.invalidate(),
          utils.opportunities.closedList.invalidate(),
          utils.opportunities.stats.invalidate(),
          utils.dashboard.stats.invalidate(),
          utils.dashboard.followUpAlerts.invalidate(),
        ]);

        toast.success("Oportunidade criada!");
      }
      
      modalDebug("explicit setOpen(false): submit success", {
        opportunityId: opportunity?.id,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[opportunity.update] failed", {
        opportunityId: opportunity?.id,
        error,
      });
      toast.error("Erro ao salvar oportunidade.");
      void Promise.all([
        utils.opportunities.list.invalidate(),
        utils.opportunities.closedList.invalidate(),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting;

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
      modalDebug("explicit setOpen(false): closeWithOutcome success", {
        opportunityId: opportunity?.id,
        outcome: pendingOutcome,
      });
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        modalDebug("onOpenChange", {
          nextOpen,
          opportunityId: opportunity?.id,
          activeElementTag: typeof document !== "undefined" ? document.activeElement?.tagName : undefined,
          activeElementClass:
            typeof document !== "undefined"
              ? (document.activeElement as HTMLElement | null)?.className
              : undefined,
          title: formData.title,
          stack: new Error().stack,
        });
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="">
            <Briefcase className="w-4 h-4 mr-2" />
            {opportunity ? "Editar" : "Nova Oportunidade"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-lg "
        onPointerDownOutside={(e) => {
          modalDebug("pointerDownOutside", e.target);
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          modalDebug("interactOutside", e.target);
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          modalDebug("focusOutside", e.target);
          e.preventDefault();
        }}
        onPointerDownCapture={(e) => {
          modalDebug("pointerDownCapture", e.target);
          e.stopPropagation();
        }}
        onMouseDownCapture={(e) => {
          modalDebug("mouseDownCapture", e.target);
          e.stopPropagation();
        }}
        onTouchStartCapture={(e) => {
          modalDebug("touchStartCapture", e.target);
          e.stopPropagation();
        }}
        onFocusCapture={(e) => {
          modalDebug("focusCapture", e.target);
        }}
        onBlurCapture={(e) => {
          modalDebug("blurCapture", e.target);
        }}
      >
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
              onFocus={(e) => modalDebug("title focus", e.target)}
              onClick={(e) => modalDebug("title click", e.target)}
              onPointerDown={(e) => modalDebug("title pointerdown", e.target)}
              onMouseDown={(e) => modalDebug("title mousedown", e.target)}
              onChange={(e) => {
                modalDebug("title change", e.target.value);
                setFormData({ ...formData, title: e.target.value });
              }}
              required
              className=" mt-1"
              placeholder="Ex: Consultoria XYZ"
            />
          </div>

          <div>
            <Label className="text-foreground">Contato Vinculado *</Label>
            <ContactAutocomplete
              value={formData.contactId}
              onValueChange={(val) => setFormData({ ...formData, contactId: val })}
              disabled={!!defaultContactId}
              initialContact={selectedContact}
              onContactSelected={setSelectedContact}
              placeholder="Selecione o contato..."
            />
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
                            modalDebug("explicit setOpen(false): delete success", {
                              opportunityId: opportunity?.id,
                            });
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
              <Button type="button" variant="outline" onClick={() => {
                modalDebug("explicit setOpen(false): cancel button", {
                  opportunityId: opportunity?.id,
                });
                setOpen(false);
              }}
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
        onPointerDownOutside={(event) => {
          modalDebug("outcome pointerDownOutside", event.target);
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          modalDebug("outcome interactOutside", event.target);
          event.preventDefault();
        }}
        onFocusOutside={(event) => {
          modalDebug("outcome focusOutside", event.target);
          event.preventDefault();
        }}
        onPointerDownCapture={(e) => {
          modalDebug("outcome pointerDownCapture", e.target);
          e.stopPropagation();
        }}
        onMouseDownCapture={(e) => {
          modalDebug("outcome mouseDownCapture", e.target);
          e.stopPropagation();
        }}
        onTouchStartCapture={(e) => {
          modalDebug("outcome touchStartCapture", e.target);
          e.stopPropagation();
        }}
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


