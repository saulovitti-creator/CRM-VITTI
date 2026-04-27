import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DuplicateGroupCard } from "./DuplicateGroupCard";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import type { Lead } from "../../../drizzle/schema";

interface DuplicateGroup {
  key: string;
  type: "name" | "phone";
  value: string;
  leads: Lead[];
  count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  type: "CRM" | "Site";
}

export function DuplicatesResolverModal({
  open,
  onClose,
  duplicateGroups: initialGroups,
  type,
}: Props) {
  // IMPORTANT:
  // Este modal é montado mesmo quando `open=false`. Se usarmos useState(initialGroups)
  // uma única vez, o estado fica preso no valor inicial (geralmente []) e o modal sempre
  // mostrará "0 grupos" mesmo que a prop seja atualizada após o scan.
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [resolvedGroups, setResolvedGroups] = useState<Set<string>>(new Set());
  const [isResolving, setIsResolving] = useState(false);

  // Sincronizar estado interno com o resultado mais recente do backend
  useEffect(() => {
    if (!open) return;
    setGroups(Array.isArray(initialGroups) ? initialGroups : []);
    setResolvedGroups(new Set());
  }, [open, initialGroups]);

  const utils = trpc.useUtils();
  const mergeMutation = trpc.leads.mergeDuplicates.useMutation();
  const deleteMutation = trpc.leads.bulkDelete.useMutation();
  const resolveAllMutation = trpc.leads.resolveAllDuplicates.useMutation();

  // Calcular estatísticas
  const totalGroups = groups.length;
  const totalDuplicates = groups.reduce((sum, g) => sum + (g?.count ?? 0), 0);
  const toRemove = Math.max(0, totalDuplicates - totalGroups);

  // Handler: Manter apenas o mais recente
  const handleKeepNewest = async (group: DuplicateGroup) => {
    try {
      // Ordenar por data (mais recente primeiro)
      const sorted = [...group.leads].sort(
        (a, b) =>
          new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
      );

      const toDelete = sorted.slice(1).map((l) => l.id);

      await deleteMutation.mutateAsync({ ids: toDelete });

      // Remover grupo da lista
      setGroups((prev) => prev.filter((g) => g.key !== group.key));
      setResolvedGroups((prev) => new Set(prev).add(group.key));

      // Invalidar queries
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();

      toast.success(
        `✅ Mantido lead mais recente. ${toDelete.length} leads duplicados removidos.`
      );
    } catch (error) {
      toast.error("❌ Erro ao remover duplicados");
      console.error(error);
    }
  };

  // Handler: Mesclar todos os leads
  const handleMerge = async (group: DuplicateGroup) => {
    try {
      // Ordenar por data (mais recente primeiro)
      const sorted = [...group.leads].sort(
        (a, b) =>
          new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
      );

      const keepLeadId = sorted[0].id;
      const deleteLeadIds = sorted.slice(1).map((l) => l.id);

      await mergeMutation.mutateAsync({ keepLeadId, deleteLeadIds });

      // Remover grupo da lista
      setGroups((prev) => prev.filter((g) => g.key !== group.key));
      setResolvedGroups((prev) => new Set(prev).add(group.key));

      // Invalidar queries
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();

      toast.success(
        `✅ Leads mesclados com sucesso. ${deleteLeadIds.length} duplicados removidos.`
      );
    } catch (error) {
      toast.error("❌ Erro ao mesclar leads");
      console.error(error);
    }
  };

  // Handler: Ignorar grupo
  const handleIgnore = (groupKey: string) => {
    setGroups((prev) => prev.filter((g) => g.key !== groupKey));
    setResolvedGroups((prev) => new Set(prev).add(groupKey));
    toast.info("Grupo ignorado");
  };

  // Handler: Resolver todos automaticamente (global)
  const handleResolveAll = async (
    strategy: "newest" | "oldest" | "merge" | "ignore"
  ) => {
    // "Ignorar todos" = não mexe no banco, só fecha/limpa a tela
    if (strategy === "ignore") {
      setGroups([]);
      toast.info("Ignorado: nenhum dado foi alterado");
      onClose();
      return;
    }

    // Confirmação simples para evitar clique-acidental
    const confirmText =
      strategy === "merge"
        ? `Isso vai MESCLAR ${totalGroups} grupos e remover até ${toRemove} leads. Continuar?`
        : `Isso vai remover até ${toRemove} leads (mantendo 1 por grupo). Continuar?`;
    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    setIsResolving(true);

    try {
      const apiStrategy =
        strategy === "merge"
          ? "MERGE"
          : strategy === "oldest"
            ? "KEEP_OLDEST"
            : "KEEP_NEWEST";

      const result = await resolveAllMutation.mutateAsync({
        type,
        strategy: apiStrategy,
      });

      // Invalidar queries
      await utils.leads.list.invalidate();
      await utils.leads.stats.invalidate();
      await utils.leads.getUniqueSegments.invalidate();

      toast.success(
        `✅ ${result.groupsProcessed}/${result.totalGroups} grupos resolvidos. ${result.leadsDeleted} leads removidos.`
      );
      setGroups([]);
      onClose();
    } catch (error) {
      toast.error("❌ Erro ao resolver duplicados");
      console.error(error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            Duplicados Encontrados na Base
          </DialogTitle>
          <p className="text-foreground">
            Foram encontrados <span className="font-bold text-primary">{totalGroups}</span>{" "}
            grupos com <span className="font-bold text-yellow-400">{totalDuplicates}</span>{" "}
            leads duplicados. Você pode remover até{" "}
            <span className="font-bold text-red-400">{toRemove}</span> leads.
          </p>
        </DialogHeader>

        {/* Botão "Resolver Todos" */}
        {groups.length > 0 && (
          <div className="mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isResolving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Resolvendo...
                    </>
                  ) : (
                    <>
                      Resolver Todos <ChevronDown className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-muted border-border">
                <DropdownMenuItem
                  onClick={() => handleResolveAll("newest")}
                  className="text-white hover:bg-muted"
                >
                  Manter sempre o mais recente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleResolveAll("oldest")}
                  className="text-white hover:bg-muted"
                >
                  Manter sempre o mais antigo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleResolveAll("merge")}
                  className="text-white hover:bg-muted"
                >
                  Mesclar todos automaticamente
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleResolveAll("ignore")}
                  className="text-white hover:bg-muted"
                >
                  Ignorar todos (não fazer nada)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Lista de grupos */}
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">✅ Todos os duplicados foram resolvidos!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, index) => (
              <div key={group.key}>
                <div className="text-sm text-muted-foreground mb-2">
                  Grupo {index + 1} de {totalGroups}
                </div>
                <DuplicateGroupCard
                  group={group}
                  onKeepNewest={handleKeepNewest}
                  onMerge={handleMerge}
                  onIgnore={handleIgnore}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
