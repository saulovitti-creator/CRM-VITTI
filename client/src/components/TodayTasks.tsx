import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, AlertCircle, Check, Flame, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "crm-todaytasks-collapsed";

export function TodayTasks() {
  const { getTasksForToday, getOverdueTasks, completeTask } = useTasks();
  const alertsQuery = trpc.dashboard.followUpAlerts.useQuery({ days: 3 });
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const todayTasks = getTasksForToday();
  const overdueTasks = getOverdueTasks();
  const coldLeads = alertsQuery.data || [];
  
  const totalItems = todayTasks.length + overdueTasks.length + coldLeads.length;

  if (totalItems === 0) return null;

  return (
    <Card className="mb-8 bg-muted/50 border-border backdrop-blur-sm shadow-[var(--shadow-md)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary flex items-center gap-2 text-lg">
          <CheckSquare className="w-5 h-5" />
          Minhas Tarefas
          <Badge variant="outline" className="ml-2 bg-card border-primary/30 text-primary">
            {totalItems} PENDÊNCIAS
          </Badge>
          {/* Botão minimizar */}
          <button
            onClick={toggleCollapse}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            title={isCollapsed ? "Expandir tarefas" : "Minimizar tarefas"}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Expandir
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                Minimizar
              </>
            )}
          </button>
        </CardTitle>
      </CardHeader>

      {/* Conteúdo colapsável com animação */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isCollapsed ? "0px" : "400px", opacity: isCollapsed ? 0 : 1 }}
      >
        <CardContent>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Alerta: Oportunidades Frias */}
            {coldLeads.map((lead: any) => {
              const daysSince = lead.lastContactAt
                ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
                : null;
                
              return (
                <div key={`lead-${lead.id}`} className="group flex items-center justify-between p-3 rounded-lg bg-red-900/20 border border-red-500/40 hover:bg-red-900/30 transition-colors">
                  <div className="flex flex-col gap-1">
                    <p className="text-red-400 font-bold text-sm flex items-center gap-1">
                      <Flame className="w-4 h-4" /> URGENTE: Ligar para {lead.companyName}
                    </p>
                    <p className="text-xs text-red-300/80 mt-1">
                      Oportunidade parada em "{lead.status}" 
                      {daysSince !== null ? ` há ${daysSince} dias sem follow-up.` : ' sem contato.'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Tarefas Atrasadas do Vendedor */}
            {overdueTasks.map(task => (
              <div key={task.id} className="group flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => completeTask(task.id)}
                    title="Concluir Tarefa"
                    className="w-5 h-5 rounded border border-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-transparent"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <div>
                    <p className="text-red-400 font-medium text-sm flex items-center gap-1">
                      {task.source === 'auto' && <Zap className="w-3 h-3 text-yellow-400" />}
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-red-500/80 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      Atrasada
                      {task.source === 'auto' && <span className="ml-1 text-yellow-400/70">• Automática</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {todayTasks.map(task => (
              <div key={task.id} className="group flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/40 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => completeTask(task.id)}
                    title="Concluir Tarefa"
                    className="w-5 h-5 rounded border border-border hover:bg-primary hover:border-primary hover:text-white transition-colors flex items-center justify-center text-transparent"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <div>
                    <p className="text-foreground font-medium text-sm group-hover:text-white transition-colors flex items-center gap-1">
                      {task.source === 'auto' && <Zap className="w-3 h-3 text-yellow-400" />}
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      Hoje
                      {task.source === 'auto' && <span className="ml-1 text-yellow-400/70">• Automática</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
