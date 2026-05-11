import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { Trash2, Building, SearchX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function OpportunityListView({ opportunities, stages, isFiltered, onClearFilters }: { opportunities: any[], stages: any[], isFiltered?: boolean, onClearFilters?: () => void }) {
  const deleteMutation = trpc.opportunities.delete.useMutation();
  const utils = trpc.useUtils();

  if (!opportunities || opportunities.length === 0) {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card rounded-[10px] border border-dashed mt-4">
          <SearchX className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium mb-4">Nenhuma oportunidade encontrada com os filtros aplicados.</p>
          <Button variant="outline" onClick={onClearFilters}>Limpar Filtros</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card rounded-[10px] border mt-4">
        <p>Nenhuma oportunidade encontrada neste funil.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] border shadow-[var(--shadow-sm)] mt-4 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[300px]">Negócio / Oportunidade</TableHead>
            <TableHead>Contato Vinculado</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Valor Esperado</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opp) => {
            const stage = stages.find((s) => s.id === opp.stageId);
            return (
              <TableRow key={opp.id} className="group hover:bg-muted/30">
                <TableCell className="font-medium">
                  {opp.title}
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Building className="w-3 h-3 mr-1.5" />
                    {opp.contactName} {opp.contactCompany ? `(${opp.contactCompany})` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                    style={{ 
                      backgroundColor: stage?.color ? `${stage.color}15` : 'var(--muted)', 
                      borderColor: stage?.color ? `${stage.color}30` : 'var(--border)',
                      color: stage?.color || 'var(--foreground)'
                    }}
                  >
                    {stage?.name || 'Desconhecido'}
                  </span>
                </TableCell>
                <TableCell>
                  {opp.monetaryValue ? (
                    <span className="text-primary font-semibold tabular-nums">
                      R$ {Number(opp.monetaryValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">{opp.source || '-'}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <OpportunityFormDialog 
                      opportunity={opp} 
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                          Editar
                        </Button>
                      } 
                    />
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isto excluirá permanentemente a oportunidade e os dados associados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={async () => {
                              try {
                                await deleteMutation.mutateAsync({ id: opp.id });
                                utils.opportunities.list.invalidate();
                                toast.success("Oportunidade excluída com sucesso");
                              } catch (error: any) {
                                toast.error("Erro ao excluir: " + error.message);
                              }
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
