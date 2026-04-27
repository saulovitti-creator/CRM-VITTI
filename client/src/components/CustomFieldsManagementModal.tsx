import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { CustomFieldDefinition } from "@shared/types";

interface CustomFieldsManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto Curto" },
  { value: "textarea", label: "Texto Longo" },
  { value: "number", label: "Número" },
  { value: "currency", label: "Moeda (R$)" },
  { value: "date", label: "Data" },
  { value: "dropdown", label: "Lista Suspensa" },
  { value: "checkbox", label: "Caixa de Seleção (Sim/Não)" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "url", label: "Link/URL" },
];

export function CustomFieldsManagementModal({ open, onOpenChange }: CustomFieldsManagementModalProps) {
  const utils = trpc.useUtils();
  const { data: fields = [], isLoading } = trpc.customFields.listDefinitions.useQuery(
    { model: "lead" },
    { enabled: open }
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [groupName, setGroupName] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [optionsStr, setOptionsStr] = useState(""); // Comma separated for dropdown
  const [isRequired, setIsRequired] = useState(false);

  const createMutation = trpc.customFields.createDefinition.useMutation({
    onSuccess: () => {
      toast.success("Campo criado com sucesso!");
      utils.customFields.listDefinitions.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.customFields.updateDefinition.useMutation({
    onSuccess: () => {
      toast.success("Campo atualizado com sucesso!");
      utils.customFields.listDefinitions.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.customFields.deleteDefinition.useMutation({
    onSuccess: () => {
      toast.success("Campo removido com sucesso!");
      utils.customFields.listDefinitions.invalidate();
    },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setName("");
    setFieldType("text");
    setGroupName("");
    setPlaceholder("");
    setOptionsStr("");
    setIsRequired(false);
  };

  const startEdit = (field: CustomFieldDefinition) => {
    setEditingId(field.id);
    setName(field.name);
    setFieldType(field.fieldType);
    setGroupName(field.groupName || "");
    setPlaceholder(field.placeholder || "");
    setIsRequired(field.isRequired || false);
    
    if (field.options) {
      try {
        const parsed = JSON.parse(field.options);
        setOptionsStr(Array.isArray(parsed) ? parsed.join(", ") : "");
      } catch {
        setOptionsStr(field.options);
      }
    } else {
      setOptionsStr("");
    }
    
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("O nome do campo é obrigatório.");
      return;
    }

    let optionsJson = undefined;
    if (fieldType === "dropdown" && optionsStr.trim()) {
      const opts = optionsStr.split(",").map(s => s.trim()).filter(Boolean);
      if (opts.length === 0) {
        toast.error("Adicione pelo menos uma opção para a lista suspensa.");
        return;
      }
      optionsJson = JSON.stringify(opts);
    }

    const payload = {
      name: name.trim(),
      fieldType: fieldType as any,
      model: "lead",
      groupName: groupName.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      options: optionsJson,
      isRequired,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("ATENÇÃO: Remover este campo apagará todos os dados salvos nele para TODOS os leads. Deseja continuar?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary">Campos Personalizados (Custom Fields)</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione campos extras para capturar informações específicas do seu negócio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-4 space-y-4">
          
          {/* Create/Edit Form */}
          {(isCreating || editingId) ? (
            <div className="bg-muted/80 p-5 rounded-lg border border-primary/30 space-y-4 shadow-[var(--shadow-md)]">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">
                {editingId ? "Editar Campo" : "Novo Campo Personalizado"}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Campo <span className="text-red-400">*</span></Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card border-border focus:border-primary"
                    placeholder="Ex: CNPJ, Porte da Empresa..."
                  />
                </div>
                
                <div className="space-y-1">
                  <Label>Tipo de Campo <span className="text-red-400">*</span></Label>
                  <Select value={fieldType} onValueChange={setFieldType} disabled={!!editingId}>
                    <SelectTrigger className="bg-card border-border focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      {FIELD_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!!editingId && <p className="text-[10px] text-muted-foreground mt-1">Não é possível mudar o tipo de um campo existente.</p>}
                </div>

                <div className="space-y-1">
                  <Label>Grupo (Opcional)</Label>
                  <Input 
                    value={groupName} 
                    onChange={(e) => setGroupName(e.target.value)}
                    className="bg-card border-border"
                    placeholder="Ex: Dados Fiscais, Qualificação"
                  />
                  <p className="text-[10px] text-muted-foreground">Agrupa os campos visualmente no formulário.</p>
                </div>

                <div className="space-y-1">
                  <Label>Placeholder (Opcional)</Label>
                  <Input 
                    value={placeholder} 
                    onChange={(e) => setPlaceholder(e.target.value)}
                    className="bg-card border-border"
                    placeholder="Texto de dica dentro do campo"
                    disabled={fieldType === "checkbox" || fieldType === "date"}
                  />
                </div>
              </div>

              {fieldType === "dropdown" && (
                <div className="space-y-1 pt-2 border-t border-border/50">
                  <Label>Opções da Lista Suspensa <span className="text-red-400">*</span></Label>
                  <Textarea 
                    value={optionsStr} 
                    onChange={(e) => setOptionsStr(e.target.value)}
                    className="bg-card border-border"
                    placeholder="Opção 1, Opção 2, Opção 3..."
                    rows={2}
                  />
                  <p className="text-[10px] text-muted-foreground">Separe as opções por vírgula.</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Checkbox 
                  id="isRequired" 
                  checked={isRequired} 
                  onCheckedChange={(c) => setIsRequired(!!c)} 
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="isRequired" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                  Tornar este campo obrigatório ao salvar o lead
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Campo"}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-dashed border-primary/30 hover:border-primary hover:bg-primary/10 text-primary h-12"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Novo Campo
            </Button>
          )}

          {/* Fields List */}
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Campos Configurados</h4>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : fields.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8 bg-muted/30 rounded-lg border border-border border-dashed">
                Nenhum campo personalizado cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.id} className="bg-muted/60 p-3 rounded-lg border border-border/50 flex items-center justify-between group hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{field.name}</span>
                          {field.isRequired && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-medium">Obrigatório</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="bg-card px-1.5 py-0.5 rounded text-foreground border border-border">
                            {FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}
                          </span>
                          {field.groupName && (
                            <span className="text-primary/70">Grupo: {field.groupName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => startEdit(field as any)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-muted" onClick={() => handleDelete(field.id)}>
                        {deleteMutation.isPending && deleteMutation.variables?.id === field.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
