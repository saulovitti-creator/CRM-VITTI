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
      await utils.contacts.list.invalidate();
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Erro ao salvar contato");
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <UserPlus className="w-4 h-4 mr-2" />
            {contact ? "Editar" : "Novo Contato"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {contact ? "Atualize os dados do contato" : "Cadastre uma nova pessoa ou empresa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <Label className="text-slate-300">Empresa</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label className="text-slate-300">E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="email@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Segmento</Label>
              <Input
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="Ex: Clínica, Restaurante"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Site</Label>
              <Input
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-slate-300">Origem</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 mt-1"
                placeholder="Google, Indicação..."
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Tags</Label>
            <TagSelector
              selectedTagIds={formData.tagIds}
              onChange={(ids) => setFormData({ ...formData, tagIds: ids })}
            />
          </div>

          <div>
            <Label className="text-slate-300">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800 border-slate-600 text-slate-100 mt-1 h-20 resize-y"
              placeholder="Informações gerais sobre este contato..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}
              className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {isLoading ? "Salvando..." : contact ? "Atualizar" : "Criar Contato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
