import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  X,
  Edit2,
  Trash2,
  MessageCircle,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  User,
  Calendar,
  FileText,
  Tag,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp";
import { WhatsAppButton } from "./WhatsAppButton";
import { FinalStatusModal } from "./FinalStatusModal";
import { ProspectTasksSection } from "./ProspectTasksSection";
import { TimelineNotes } from "./TimelineNotes";
import { TagSelector } from "./TagSelector";
import { TagBadge } from "./TagBadge";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

interface Lead {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  segment: string;
  status: "Entrar em contato" | "Contatado" | "Não Respondeu" | "Interessado" | "Não possui Interesse" | "Perdido" | "Abandonado" | "Ganho";
  city: string;
  site: string;
  implementationValue?: number | string;
  recurringValue?: number | string;
  notes: string;
  type: "CRM" | "Site";
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{ id: number; name: string; color: string; createdAt: Date; }>;
}

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated?: () => void;
}

const STATUS_OPTIONS = [
  { value: "Entrar em contato", label: "Entrar em contato", color: "bg-blue-500" },
  { value: "Contatado", label: "Contatado", color: "bg-orange-500" },
  { value: "Não Respondeu", label: "Não Respondeu", color: "bg-slate-500" },
  { value: "Interessado", label: "Interessado", color: "bg-green-500" },
  { value: "Não possui Interesse", label: "Não possui Interesse", color: "bg-muted" },
];

export default function LeadDetailsModal({
  lead,
  open,
  onOpenChange,
  onLeadUpdated,
}: LeadDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead | null>(lead);
  const [newNote, setNewNote] = useState("");
  const [finalStatusModal, setFinalStatusModal] = useState<{ open: boolean; status: "Perdido" | "Abandonado" | "Ganho" | null }>({ open: false, status: null });

  // Custom Fields
  const utils = trpc.useUtils();
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
    }
  }, [existingValues, open]);

  // Sincronizar editedLead quando lead prop mudar
  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
      setIsEditing(false); // Reset editing state
    }
  }, [lead]);

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead atualizado com sucesso!");
      setIsEditing(false);
      utils.customFields.getValues.invalidate();
      onLeadUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar lead");
    },
  });

  const saveCustomValuesMutation = trpc.customFields.setValues.useMutation();

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deletado com sucesso!");
      onOpenChange(false);
      onLeadUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao deletar lead");
    },
  });

  const addNoteMutation = trpc.leads.addNote.useMutation({
    onSuccess: () => {
      toast.success("Nota adicionada com sucesso!");
      setNewNote("");
      onLeadUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar nota");
    },
  });

  if (!lead) return null;

  const handleSave = async () => {
    if (!editedLead) return;

    try {
      // Salvar os campos customizados
      if (customFields && customFields.length > 0) {
        const valuesArray = Object.entries(customValues).map(([defId, val]) => ({
          definitionId: parseInt(defId),
          value: val,
        }));
        
        const missingRequired = customFields.find(f => 
          f.isRequired && (!customValues[f.id] || customValues[f.id] === "")
        );

        if (missingRequired) {
          toast.warning(`Atenção: O campo "${missingRequired.name}" é obrigatório, mas o lead foi salvo.`);
        }

        if (valuesArray.length > 0) {
          await saveCustomValuesMutation.mutateAsync({
            entityId: editedLead.id,
            entityType: "lead",
            values: valuesArray,
          });
        }
      }

      await updateMutation.mutateAsync({
        id: editedLead.id,
        companyName: editedLead.company_name?.trim() || "",
        contactName: editedLead.contact_name?.trim() || "",
        phone: editedLead.phone?.trim() || "",
        email: editedLead.email?.trim() || "",
        segment: editedLead.segment?.trim() || "",
        status: editedLead.status,
        city: editedLead.city?.trim() || "",
        site: editedLead.site?.trim() || "",
        implementationValue: editedLead.implementationValue ? parseFloat(String(editedLead.implementationValue)) : undefined,
        recurringValue: editedLead.recurringValue ? parseFloat(String(editedLead.recurringValue)) : undefined,
        notes: editedLead.notes?.trim() || "",
        tagIds: editedLead.tags?.map((t: any) => t.id) || [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: lead.id });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      leadId: lead.id,
      content: newNote,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (editedLead) {
      setEditedLead({ ...editedLead, status: newStatus as "Entrar em contato" | "Contatado" | "Não Respondeu" | "Interessado" | "Não possui Interesse" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground overflow-hidden">
          <DialogHeader className="border-b border-border pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-primary">
                  {isEditing ? "Editar Lead" : "Detalhes do Lead"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editedLead?.company_name}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="border-border hover:bg-muted"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteAlert(true)}
                      className="border-red-600 hover:bg-red-900/20 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto pr-2" style={{ maxHeight: 'calc(80vh - 180px)' }}>
            {/* Informações Principais */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informações Principais
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Empresa <span className="text-red-400">*</span></label>
                  {isEditing ? (
                    <Input
                      value={editedLead?.company_name || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          company_name: e.target.value,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{lead.company_name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Contato</label>
                  {isEditing ? (
                    <Input
                      value={editedLead?.contact_name || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          contact_name: e.target.value,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{lead.contact_name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              
              {isEditing ? (
                <TagSelector 
                  selectedTagIds={editedLead?.tags?.map(t => t.id) || []}
                  onChange={(tagIds) => {
                    // Temporarily using selected IDs. The DB update will handle the relation,
                    // but for local state we just need to keep track of IDs.
                    // We map them to mock tags so the render doesn't break.
                    setEditedLead({
                      ...editedLead!,
                      tags: tagIds.map(id => ({ id, name: "Salvar para ver", color: "#64748b", createdAt: new Date() }))
                    });
                  }}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lead.tags && lead.tags.length > 0 ? (
                    lead.tags.map(tag => (
                      <TagBadge key={tag.id} tag={tag as any} />
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhuma tag preenchida</span>
                  )}
                </div>
              )}
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Dados de Contato
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Telefone <span className="text-red-400">*</span></label>
                  {isEditing ? (
                    <Input
                      value={editedLead?.phone || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          phone: e.target.value,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-foreground font-medium">{lead.phone}</p>
                      {lead.phone && (
                      <WhatsAppButton phone={lead.phone} leadId={lead.id} size="sm" />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editedLead?.email || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          email: e.target.value,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{lead.email || "-"}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Site</label>
                {isEditing ? (
                  <Input
                    value={editedLead?.site || ""}
                    onChange={(e) =>
                      setEditedLead({
                        ...editedLead!,
                        site: e.target.value,
                      })
                    }
                    className="bg-muted border-border text-foreground mt-1"
                  />
                ) : (
                  <p className="text-foreground font-medium">{lead.site || "-"}</p>
                )}
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Valores
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Valor Implantação (R$)</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedLead?.implementationValue || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          implementationValue: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-foreground font-medium mt-1">
                      {lead.implementationValue ? `R$ ${parseFloat(String(lead.implementationValue)).toFixed(2).replace('.', ',')}` : "-"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Valor Recorrência (R$)</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedLead?.recurringValue || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          recurringValue: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-foreground font-medium mt-1">
                      {lead.recurringValue ? `R$ ${parseFloat(String(lead.recurringValue)).toFixed(2).replace('.', ',')}` : "-"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Classificação */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Classificação
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Segmento <span className="text-red-400">*</span></label>
                  {isEditing ? (
                    <Input
                      value={editedLead?.segment || ""}
                      onChange={(e) =>
                        setEditedLead({
                          ...editedLead!,
                          segment: e.target.value,
                        })
                      }
                      className="bg-muted border-border text-foreground mt-1"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{lead.segment}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <p className="text-foreground font-medium mt-1">{lead.type}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                {isEditing ? (
                  <Select value={editedLead?.status || ""} onValueChange={handleStatusChange}>
                    <SelectTrigger className="bg-muted border-border text-foreground mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground font-medium mt-1">{lead.status}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Cidade</label>
                {isEditing ? (
                  <Input
                    value={editedLead?.city || ""}
                    onChange={(e) =>
                      setEditedLead({
                        ...editedLead!,
                        city: e.target.value,
                      })
                    }
                    className="bg-muted border-border text-foreground mt-1"
                  />
                ) : (
                  <p className="text-foreground font-medium">{lead.city || "-"}</p>
                )}
              </div>
            </div>

            {/* Custom Fields (Informações Adicionais) */}
            {customFields && customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informações Adicionais
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {customFields.map(field => (
                    <DynamicFieldRenderer
                      key={field.id}
                      definition={field}
                      value={customValues[field.id] || null}
                      onChange={(val) => setCustomValues(prev => ({ ...prev, [field.id]: val }))}
                      readOnly={!isEditing}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notas + Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Linha do Tempo
              </h3>

              {isEditing ? (
                <Textarea
                  value={editedLead?.notes || ""}
                  onChange={(e) =>
                    setEditedLead({
                      ...editedLead!,
                      notes: e.target.value,
                    })
                  }
                  className="bg-muted border-border text-foreground min-h-24"
                  placeholder="Adicione observações sobre este lead..."
                />
              ) : (
                <>
                  {/* Input de nova nota */}
                  <div className="flex gap-2">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar nova nota..."
                      className="bg-muted border-border text-foreground"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddNote();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Adicionar
                    </Button>
                  </div>

                  {/* Timeline visual */}
                  <TimelineNotes leadId={lead.id} />
                </>
              )}
            </div>

            {/* SEÇÃO DE TAREFAS */}
            {!isEditing && lead && (
              <ProspectTasksSection prospectId={lead.id} />
            )}

            {/* Datas */}
            <div className="space-y-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Datas
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Criado em</label>
                  <p className="text-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Atualizado em</label>
                  <p className="text-foreground">
                    {new Date(lead.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé unificado: Status Final + Ações */}
          <div className="border-t border-border pt-4 shrink-0">
            {isEditing ? (
              /* Modo edição: tudo em uma linha */
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Final (só se o lead não estiver em status final) */}
                {lead && !["Perdido", "Abandonado", "Ganho"].includes(lead.status) && (
                  <>
                    <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">Mover para:</span>
                    <Button
                      onClick={() => setFinalStatusModal({ open: true, status: "Perdido" })}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 h-8"
                      size="sm"
                    >
                      Perdido
                    </Button>
                    <Button
                      onClick={() => setFinalStatusModal({ open: true, status: "Abandonado" })}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 h-8"
                      size="sm"
                    >
                      Abandonado
                    </Button>
                    <Button
                      onClick={() => setFinalStatusModal({ open: true, status: "Ganho" })}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-8"
                      size="sm"
                    >
                      Ganho
                    </Button>
                    <div className="w-px h-6 bg-muted mx-1" />
                  </>
                )}
                {/* Ações de edição */}
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedLead(lead);
                    }}
                    className="border-border hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Modo visualização: separado, comportamento original */
              <div className="space-y-3">
                {lead && !["Perdido", "Abandonado", "Ganho"].includes(lead.status) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">Mover para Status Final:</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setFinalStatusModal({ open: true, status: "Perdido" })}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        Perdido
                      </Button>
                      <Button
                        onClick={() => setFinalStatusModal({ open: true, status: "Abandonado" })}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs"
                      >
                        Abandonado
                      </Button>
                      <Button
                        onClick={() => setFinalStatusModal({ open: true, status: "Ganho" })}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        Ganho
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="border-border hover:bg-muted"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Status Modal */}
      {finalStatusModal.status && lead && (
        <FinalStatusModal
          open={finalStatusModal.open}
          onOpenChange={(open) => setFinalStatusModal({ ...finalStatusModal, open })}
          leadId={lead.id}
          leadName={lead.company_name}
          status={finalStatusModal.status}
          onSuccess={() => {
            onOpenChange(false);
            onLeadUpdated?.();
          }}
        />
      )}

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Deletar Lead</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja deletar este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-border hover:bg-muted">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
