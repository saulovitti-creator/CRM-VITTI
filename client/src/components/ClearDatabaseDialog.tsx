import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ClearDatabaseDialog() {
  const [open, setOpen] = useState(false);
  const clearMutation = trpc.leads.clear.useMutation();
  const utils = trpc.useUtils();

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync({ confirm: true });
      toast.success("Base de dados limpa com sucesso!");
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao limpar base de dados");
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Limpar Base
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Base de Dados</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>todos</strong> os registros?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700"
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
