import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LEAD_CATEGORIES, LEAD_STATUSES, type Lead } from "@shared/types";
import { toast } from "sonner";
import { TagSelector } from "./TagSelector";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

interface LeadFormDialogProps {
  lead?: Lead;
  onSuccess?: () => void;
  type?: "CRM" | "Site";
}

export function LeadFormDialog({ lead, onSuccess, type }: LeadFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: lead?.companyName || "",
    contactName: lead?.contactName || "",
    phone: lead?.phone || "",
    email: lead?.email || "",
    segment: lead?.segment || "",
    status: (lead?.status || "Entrar em contato") as "Entrar em contato" | "Contatado" | "Não Respondeu" | "Interessado" | "Não possui Interesse" | "Perdido" | "Abandonado" | "Ganho",
    site: lead?.site || "",
    city: lead?.city || "",
    notes: lead?.notes || "",
    type: (lead?.type || type || "CRM") as "CRM" | "Site",
    dataCriacao: lead?.dataCriacao ? new Date(lead.dataCriacao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    tagIds: (lead as any)?.tags?.map((t: any) => t.id) || [],
  });

  const createMutation = trpc.leads.create.useMutation();
  const updateMutation = trpc.leads.update.useMutation();
  const saveCustomValuesMutation = trpc.customFields.setValues.useMutation();
  const utils = trpc.useUtils();

  // Custom Fields State
  const [customValues, setCustomValues] = useState<Record<number, string | null>>({});

  const { data: customFields } = trpc.customFields.listDefinitions.useQuery(
    { model: "lead" },
    { enabled: open }
  );

  const { data: existingValues } = trpc.customFields.getValues.useQuery(
    { entityId: lead?.id as number, entityType: "lead" },
    { enabled: open && !!lead?.id }
  );

  useEffect(() => {
    if (existingValues) {
      const vals: Record<number, string | null> = {};
      existingValues.forEach(v => vals[v.definitionId] = v.value);
      setCustomValues(vals);
    } else if (!lead) {
      setCustomValues({});
    }
  }, [existingValues, lead, open]);

  // Resetar formData quando modal abrir ou type mudar
  useEffect(() => {
    if (open && !lead) {
      setFormData({
        companyName: "",
        contactName: "",
        phone: "",
        email: "",
        segment: "",
        status: "Entrar em contato",
        site: "",
        city: "",
        notes: "",
        type: type || "CRM",
        dataCriacao: new Date().toISOString().split('T')[0],
        tagIds: [],
      });
    }
  }, [open, type, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSend = {
        ...formData,
        type: formData.type as "CRM" | "Site",
        dataCriacao: new Date(formData.dataCriacao),
      };

      let finalLeadId = lead?.id;

      if (lead?.id) {
        await updateMutation.mutateAsync({
          id: lead.id,
          ...dataToSend,
        });
        toast.success("Prospecto atualizado com sucesso!");
      } else {
        const result = await createMutation.mutateAsync(dataToSend);
        finalLeadId = (result as any)?.id;
        toast.success("Prospecto criado com sucesso!");
      }

      // Salvar campos personalizados se houver
      if (finalLeadId && customFields && customFields.length > 0) {
        const valuesArray = Object.entries(customValues).map(([defId, val]) => ({
          definitionId: parseInt(defId),
          value: val,
        }));
        
        // Verifica se há campos obrigatórios vazios
        const missingRequired = customFields.find(f => 
          f.isRequired && (!customValues[f.id] || customValues[f.id] === "")
        );

        if (missingRequired) {
          toast.warning(`Atenção: O campo "${missingRequired.name}" é obrigatório, mas o lead foi salvo. Por favor, preencha-o.`);
        }

        if (valuesArray.length > 0) {
          await saveCustomValuesMutation.mutateAsync({
            entityId: finalLeadId,
            entityType: "lead",
            values: valuesArray,
          });
        }
      }

      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao salvar prospecto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {lead ? "Editar" : "Novo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lead ? "Editar Prospecto" : "Novo Prospecto"}
          </DialogTitle>
          <DialogDescription>
            {lead
              ? "Atualize as informações do prospecto"
              : "Adicione um novo prospecto ao seu CRM"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="companyName">Empresa *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="contactName">Contato</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="segment">Segmento</Label>
            <Input
              id="segment"
              placeholder="Ex: E-commerce, SaaS, Advocacia"
              value={formData.segment}
              onChange={(e) => {
                const value = e.target.value.substring(0, 100);
                setFormData({ ...formData, segment: value });
              }}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.segment.length}/100 caracteres
            </p>
          </div>

          <div>
            <Label>Tags</Label>
            <TagSelector 
              selectedTagIds={formData.tagIds} 
              onChange={(tagIds) => setFormData({ ...formData, tagIds })} 
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="site">Site</Label>
            <Input
              id="site"
              type="text"
              value={formData.site}
              onChange={(e) =>
                setFormData({ ...formData, site: e.target.value })
              }
              placeholder="https://exemplo.com.br ou (Instagram)"
            />
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Custom Fields (Renderizados Dinamicamente) */}
          {customFields && customFields.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-4 my-4">
              <h4 className="text-sm font-semibold text-cyan-400 border-b border-slate-700 pb-2">Informações Adicionais</h4>
              
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
                      <h5 className="text-xs font-medium text-slate-400 mt-4 uppercase">{groupName}</h5>
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
            <Label htmlFor="dataCriacao" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Criação
            </Label>
            <Input
              id="dataCriacao"
              type="date"
              value={formData.dataCriacao}
              onChange={(e) =>
                setFormData({ ...formData, dataCriacao: e.target.value })
              }
              className="bg-slate-700/50 border-cyan-500/30 text-slate-100"
            />
            <p className="text-xs text-slate-400 mt-1">Data padrão: hoje</p>
          </div>

          {/* Botões de Status Final */}
          {lead?.id && !["Perdido", "Abandonado", "Ganho"].includes(formData.status) && (
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <p className="text-sm font-semibold text-black">Mover para Status Final:</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const { dataCriacao, ...updateData } = formData;
                      await updateMutation.mutateAsync({
                        id: lead.id,
                        ...updateData,
                        status: "Perdido",
                      });
                      toast.success("Lead movido para Perdido");
                      await utils.leads.list.invalidate();
                      await utils.leads.stats.invalidate();
                      await utils.leads.getUniqueSegments.invalidate();
                      setOpen(false);
                      onSuccess?.();
                    } catch (error) {
                      toast.error("Erro ao mover lead");
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Perdido
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const { dataCriacao, ...updateData } = formData;
                      await updateMutation.mutateAsync({
                        id: lead.id,
                        ...updateData,
                        status: "Abandonado",
                      });
                      toast.success("Lead movido para Abandonado");
                      await utils.leads.list.invalidate();
                      await utils.leads.stats.invalidate();
                      await utils.leads.getUniqueSegments.invalidate();
                      setOpen(false);
                      onSuccess?.();
                    } catch (error) {
                      toast.error("Erro ao mover lead");
                    }
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white"
                >
                  Abandonado
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const { dataCriacao, ...updateData } = formData;
                      await updateMutation.mutateAsync({
                        id: lead.id,
                        ...updateData,
                        status: "Ganho",
                      });
                      toast.success("Lead movido para Ganho");
                      await utils.leads.list.invalidate();
                      await utils.leads.stats.invalidate();
                      await utils.leads.getUniqueSegments.invalidate();
                      setOpen(false);
                      onSuccess?.();
                    } catch (error) {
                      toast.error("Erro ao mover lead");
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Ganho
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
