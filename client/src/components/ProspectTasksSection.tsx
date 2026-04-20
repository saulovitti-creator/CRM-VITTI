import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Trash2, Clock, AlertCircle, Check, Calendar as CalendarIcon, PhoneCall, FileText, RefreshCw } from "lucide-react";
import { useTasks, Task } from "@/hooks/useTasks";
import { format } from "date-fns";

interface ProspectTasksSectionProps {
  prospectId: number | string;
}

export function ProspectTasksSection({ prospectId }: ProspectTasksSectionProps) {
  const { addTask, getTasksByProspect, completeTask, deleteTask } = useTasks();
  
  // Lista local e global de tasks
  const prospectTasks = getTasksByProspect(String(prospectId));

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  
  // Helper de default Date
  const getTomorrow9AM = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    // converte para datetime-local format YYYY-MM-DDTHH:mm
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };
  
  const [dueDate, setDueDate] = useState<string>(getTomorrow9AM());

  // Contadores
  const pendingTasks = prospectTasks.filter(t => t.status !== "concluida");
  const overdueCount = pendingTasks.filter(t => t.status === "atrasada").length;

  // Agrupamento
  const overdueTasksList = useMemo(() => prospectTasks.filter(t => t.status === "atrasada").sort(sortTasks), [prospectTasks]);
  const pendingTasksList = useMemo(() => prospectTasks.filter(t => t.status === "pendente").sort(sortTasks), [prospectTasks]);
  const completedTasksList = useMemo(() => prospectTasks.filter(t => t.status === "concluida").sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()), [prospectTasks]);

  // States de UI (accordion behavior)
  const [showOverdue, setShowOverdue] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  function sortTasks(a: Task, b: Task) {
    const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    const pWeight = { alta: 3, media: 2, baixa: 1 };
    return pWeight[b.priority] - pWeight[a.priority];
  }

  const handleCreateTask = () => {
    if (!title.trim() || !dueDate) return;
    
    // Tenta formatar a string se for do Edge
    const dateStrObj = new Date(dueDate);

    addTask({
      prospectId: String(prospectId),
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dateStrObj.toISOString(),
      priority,
    });
    
    // Reset Form
    setTitle("");
    setDescription("");
    setDueDate(getTomorrow9AM());
    setPriority("media");
  };

  // Templates Helper
  const applyTemplate = (type: "ligar" | "proposta" | "retornar3" | "retornar7" | "reuniao") => {
    const now = new Date();
    let newDate = now;
    
    switch (type) {
      case "ligar":
        setTitle("Ligar para confirmar interesse");
        newDate.setDate(now.getDate() + 1);
        newDate.setHours(9, 0);
        break;
      case "proposta":
        setTitle("Enviar proposta");
        newDate.setDate(now.getDate() + 2);
        newDate.setHours(17, 0);
        break;
      case "retornar3":
        setTitle("Retornar contato (3 dias)");
        newDate.setDate(now.getDate() + 3);
        newDate.setHours(9, 0);
        break;
      case "retornar7":
        setTitle("Retornar contato (7 dias)");
        newDate.setDate(now.getDate() + 7);
        newDate.setHours(9, 0);
        break;
      case "reuniao":
        setTitle("Agendar reunião");
        newDate.setDate(now.getDate() + 1);
        newDate.setHours(14, 0);
        break;
    }
    
    setDueDate(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const priorityColors = {
    baixa: "text-slate-400",
    media: "text-blue-400",
    alta: "text-red-400"
  };

  const renderTaskItem = (task: Task) => {
    const isCompleted = task.status === "concluida";
    const isOverdue = task.status === "atrasada";
    
    // Calcula badge style
    let badgeStyle = "bg-slate-700 text-slate-300";
    let badgeText = "Pendente";
    if (isCompleted) {
      badgeStyle = "bg-slate-800 text-slate-500 border-slate-700";
      badgeText = "Concluída";
    } else if (isOverdue) {
      badgeStyle = "bg-red-500/20 text-red-400 border-red-500/30";
      badgeText = "Atrasada";
    } else {
      const today = new Date();
      const taskDate = new Date(task.dueDate);
      if (today.toDateString() === taskDate.toDateString()) {
        badgeStyle = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        badgeText = "Hoje";
      } else {
        badgeStyle = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
        badgeText = "Pendente";
      }
    }

    return (
      <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-md border transition-all ${isCompleted ? 'bg-slate-800/50 border-slate-800 opacity-60' : isOverdue ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-800 border-slate-700'}`}>
        <div className="pt-1">
          <button 
            onClick={() => !isCompleted && completeTask(task.id)}
            disabled={isCompleted}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-600 border-slate-600 text-slate-900 cursor-not-allowed' : 'border-slate-500 hover:border-cyan-400 hover:bg-cyan-500/20 text-transparent hover:text-cyan-400'}`}
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${!isCompleted ? priorityColors[task.priority] : 'bg-slate-600'}`} />
            <p className={`text-sm font-medium ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'} truncate`}>{task.title}</p>
            <Badge variant="outline" className={`ml-auto text-[10px] h-5 ${badgeStyle}`}>
              {badgeText}
            </Badge>
          </div>
          
          {task.description && (
            <p className={`text-xs mt-1 mb-2 line-clamp-2 ${isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(task.dueDate), "dd/MM/yyyy 'às' HH:mm")}
            </span>
            {isCompleted && task.completedAt && (
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                Done: {format(new Date(task.completedAt), "dd/MM HH:mm")}
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
              deleteTask(task.id);
            }
          }}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          Tarefas
        </h3>
        {pendingTasks.length > 0 && (
          <span className="text-xs text-slate-400">
            {pendingTasks.length} pendentes {overdueCount > 0 && <span className="text-red-400">({overdueCount} atrasadas)</span>}
          </span>
        )}
      </div>

      {/* Quick Templates */}
      <div className="flex flex-wrap gap-2 mb-2">
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-600 text-slate-300" onClick={() => applyTemplate('ligar')}>
          <PhoneCall className="w-3 h-3 mr-1" /> Ligar amanhã
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-600 text-slate-300" onClick={() => applyTemplate('proposta')}>
          <FileText className="w-3 h-3 mr-1" /> Enviar proposta
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-600 text-slate-300" onClick={() => applyTemplate('retornar3')}>
          <RefreshCw className="w-3 h-3 mr-1" /> Retornar em 3 dias
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-600 text-slate-300" onClick={() => applyTemplate('retornar7')}>
          <RefreshCw className="w-3 h-3 mr-1" /> Retornar em 7 dias
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-600 text-slate-300" onClick={() => applyTemplate('reuniao')}>
          <CalendarIcon className="w-3 h-3 mr-1" /> Agendar reunião
        </Badge>
      </div>

      {/* Form inline */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-3">
        <Input 
          placeholder="Título da tarefa... (Ex: Ligar para confirmar)" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="bg-slate-800 border-slate-700 text-slate-200 h-9"
        />
        
        <Textarea 
          placeholder="Descrição opcional..." 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          className="bg-slate-800 border-slate-700 text-slate-200 min-h-[60px] resize-none"
        />
        
        <div className="flex gap-2 items-center">
          <Input 
            type="datetime-local" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 h-9 w-auto text-sm"
          />
          
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            disabled={!title.trim() || !dueDate} 
            onClick={handleCreateTask}
            className="h-9 ml-auto bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            + Adicionar
          </Button>
        </div>
      </div>

      {/* Lista Isolada */}
      {prospectTasks.length === 0 ? (
        <div className="text-center p-4 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-500 text-sm">Nenhuma tarefa cadastrada para este prospecto</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          
          {/* Atrasadas */}
          {overdueTasksList.length > 0 && (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowOverdue(!showOverdue)}
              >
                <div className="h-px bg-red-900/40 flex-1"></div>
                <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  🔴 Atrasadas ({overdueTasksList.length})
                </span>
                <div className="h-px bg-red-900/40 flex-1"></div>
              </div>
              
              {showOverdue && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  {overdueTasksList.map(renderTaskItem)}
                </div>
              )}
            </div>
          )}

          {/* Pendentes / Futuras / Hoje */}
          {pendingTasksList.length > 0 && (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowPending(!showPending)}
              >
                <div className="h-px bg-slate-700/50 flex-1"></div>
                <span className="text-xs font-semibold text-cyan-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  🕐 Pendentes ({pendingTasksList.length})
                </span>
                <div className="h-px bg-slate-700/50 flex-1"></div>
              </div>
              
              {showPending && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  {pendingTasksList.map(renderTaskItem)}
                </div>
              )}
            </div>
          )}

          {/* Concluídas */}
          {completedTasksList.length > 0 && (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <div className="h-px bg-slate-800/50 flex-1"></div>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  ✅ Concluídas ({completedTasksList.length})
                </span>
                <div className="h-px bg-slate-800/50 flex-1"></div>
              </div>
              
              {showCompleted && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  {completedTasksList.map(renderTaskItem)}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
