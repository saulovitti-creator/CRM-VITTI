import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TagSelector } from "./TagSelector";

interface ContactFormDialogProps {
  contact?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ContactFormDialog({ contact, onSuccess, trigger }: ContactFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: contact?.name || "",
    company: contact?.company || "",
    phone: contact?.phone || "",
    email: contact?.email || "",
    city: contact?.city || "",
    site: contact?.site || "",
    segment: contact?.segment || "",
    source: contact?.source || "",
    notes: contact?.notes || "",
    tagIds: contact?.tags?.map((t: any) => t.id) || [],
  });

  const createMutation = trpc.contacts.create.useMutation();
  const updateMutation = trpc.contacts.update.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open && !contact) {
      setFormData({
        name: "", company: "", phone: "", email: "",
        city: "", site: "", segment: "", source: "", notes: "", tagIds: [],
      });
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (contact?.id) {
        await updateMutation.mutateAsync({ id: contact.id, ...formData });
        toast.success("Contato atualizado!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Contato criado!");
      }
      setOpen(false);
      onSuccess?.();
      // Invalidar cache em background (não bloqueia fechamento do modal)
      utils.contacts.list.invalidate();
    } catch (error: any) {
      toast.error(`Erro ao salvar contato: ${error.message || error}`);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            {contact ? "Editar" : "Novo Contato"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {contact ? "Atualize os dados do contato" : "Cadastre uma nova pessoa ou empresa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-muted border-border text-foreground mt-1"
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <Label className="text-foreground">Empresa</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label className="text-foreground">E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="email@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-foreground">Segmento</Label>
              <Input
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="Ex: Clínica, Restaurante"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Site</Label>
              <Input
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-foreground">Origem</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="bg-muted border-border text-foreground mt-1"
                placeholder="Google, Indicação..."
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground mb-2 block">Tags</Label>
            <TagSelector
              selectedTagIds={formData.tagIds}
              onChange={(ids) => setFormData({ ...formData, tagIds: ids })}
            />
          </div>

          <div>
            <Label className="text-foreground">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-muted border-border text-foreground mt-1 h-20 resize-y"
              placeholder="Informações gerais sobre este contato..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}
              className="border-border text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}
>
              {isLoading ? "Salvando..." : contact ? "Atualizar" : "Criar Contato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
