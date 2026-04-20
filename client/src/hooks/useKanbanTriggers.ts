import { useCallback } from 'react';
import { useTasks } from './useTasks';
import { toast } from 'sonner';

interface TriggerConfig {
  titleTemplate: string;
  daysFromNow: number;
  priority: "baixa" | "media" | "alta";
}

/**
 * Mapeamento de gatilhos: quando um lead é movido para determinada coluna,
 * uma tarefa é automaticamente criada com título, prazo e prioridade pré-definidos.
 */
const TRIGGERS: Record<string, TriggerConfig> = {
  "Entrar em contato": {
    titleTemplate: "Realizar primeiro contato com {empresa}",
    daysFromNow: 1,
    priority: "alta",
  },
  "Contatado": {
    titleTemplate: "Cobrar retorno de {empresa}",
    daysFromNow: 3,
    priority: "media",
  },
  "Não Respondeu": {
    titleTemplate: "Tentar novo contato com {empresa}",
    daysFromNow: 2,
    priority: "alta",
  },
  "Interessado": {
    titleTemplate: "Enviar proposta comercial para {empresa}",
    daysFromNow: 1,
    priority: "alta",
  },
};

/**
 * Hook que expõe a função triggerTaskForStatus.
 * Quando chamado, verifica se há gatilho para a coluna de destino,
 * checa se já existe tarefa pendente idêntica (deduplicação),
 * e cria a tarefa automaticamente se necessário.
 */
export function useKanbanTriggers() {
  const { addTask, getTasksByProspect } = useTasks();

  const triggerTaskForStatus = useCallback(
    (leadId: number | string, leadName: string, newStatus: string) => {
      const trigger = TRIGGERS[newStatus];
      if (!trigger) return; // coluna sem gatilho (ex: "Não possui Interesse")

      const title = trigger.titleTemplate.replace("{empresa}", leadName);

      // Deduplicação: verificar se já existe tarefa pendente com mesmo título
      const existingTasks = getTasksByProspect(String(leadId));
      const alreadyExists = existingTasks.some(
        (t) => t.title === title && t.status !== "concluida"
      );

      if (alreadyExists) return; // não cria duplicada

      // Calcular data de vencimento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + trigger.daysFromNow);
      dueDate.setHours(9, 0, 0, 0); // prazo às 09:00

      addTask({
        prospectId: String(leadId),
        title,
        description: `Tarefa automática gerada ao mover lead para "${newStatus}"`,
        dueDate: dueDate.toISOString(),
        priority: trigger.priority,
        source: "auto",
      });

      // Formatar data para exibição
      const formattedDate = dueDate.toLocaleDateString("pt-BR");

      toast.info(`⚡ Tarefa automática criada: "${title}" — prazo: ${formattedDate}`, {
        duration: 4000,
      });
    },
    [addTask, getTasksByProspect]
  );

  return { triggerTaskForStatus };
}
