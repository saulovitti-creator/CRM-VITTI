import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DeleteLeadDialogProps {
  leadId: number;
  companyName: string;
  onSuccess?: () => void;
}

export function DeleteLeadDialog({
  leadId,
  companyName,
  onSuccess,
}: DeleteLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = trpc.leads.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: leadId });
      toast.success("Prospecto deletado com sucesso!");
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao deletar prospecto");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Prospecto?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o prospecto <strong>{companyName}</strong>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
  );
}
