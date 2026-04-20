import { useState, useEffect, useCallback, useMemo } from 'react';


export interface Task {
  id: string;                          // UUID gerado no frontend
  prospectId: string;                  // FK para o prospecto vinculado
  title: string;                       // Título da tarefa (obrigatório, max 120 chars)
  description?: string;                // Descrição opcional (max 300 chars)
  dueDate: string;                     // ISO 8601 (ex: "2026-03-18T10:00:00")
  priority: "baixa" | "media" | "alta"; // Prioridade visual
  status: "pendente" | "concluida" | "atrasada"; // Status calculado dinamicamente
  source?: "manual" | "auto";          // Origem: manual (vendedor) ou auto (gatilho Kanban)
  createdAt: string;                   // ISO 8601
  completedAt?: string;                // Preenchido ao concluir
}

const STORAGE_KEY = 'crm_tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Carrega do localStorage na inicialização e calcula status
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsedTasks: Task[] = JSON.parse(stored);
        
        // Atualiza status dinâmico (atrasada vs pendente) on load
        const now = new Date();
        parsedTasks = parsedTasks.map(task => {
          if (task.status === 'concluida') return task;
          
          const due = new Date(task.dueDate);
          if (due.getTime() < now.getTime()) {
            return { ...task, status: 'atrasada' };
          } else {
             return { ...task, status: 'pendente' };
          }
        });
        
        setTasks(parsedTasks);
      }
    } catch (e) {
      console.error("Erro ao carregar tasks do localStorage", e);
    }
  }, []);

  // Persiste no localStorage sempre que o state tasks muda
  useEffect(() => {
    try {
      // Remove o status 'atrasada' ao salvar, guardando como pendente no storage real.
      // O recálculo é sempre feito em memória/runtime.
      const toSave = tasks.map(t => 
        t.status === 'atrasada' ? { ...t, status: 'pendente' } : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error("Erro ao salvar tasks no localStorage", e);
    }
  }, [tasks]);

  // Recalcula o status dinâmico on the fly se necessário (garantia)
  const computeStatus = useCallback((task: Task): Task => {
    if (task.status === 'concluida') return task;
    const now = new Date();
    const due = new Date(task.dueDate);
    if (due.getTime() < now.getTime()) {
      return { ...task, status: 'atrasada' };
    }
    return { ...task, status: 'pendente' };
  }, []);

  // Getter formatado
  const computedTasks = useMemo(() => {
     return tasks.map(computeStatus);
  }, [tasks, computeStatus]);

  const addTask = useCallback((taskData: Omit<Task, "id" | "createdAt" | "status">) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      source: taskData.source || 'manual',
      createdAt: new Date().toISOString(),
      status: 'pendente'
    };
    
    // Calcula o primeiro status já no add
    const verifiedTask = computeStatus(newTask);
    setTasks(prev => [...prev, verifiedTask]);
  }, [computeStatus]);

  const updateTask = useCallback((id: string, changes: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...changes } as Task;
      if (updated.status !== 'concluida') {
        const now = new Date();
        const due = new Date(updated.dueDate);
        updated.status = due.getTime() < now.getTime() ? 'atrasada' : 'pendente';
      }
      return updated;
    }));
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'concluida',
          completedAt: new Date().toISOString()
        };
      }
      return t;
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTasksByProspect = useCallback((prospectId: string) => {
    return computedTasks.filter(t => t.prospectId === String(prospectId) || t.prospectId === prospectId);
  }, [computedTasks]);

  const getTasksForToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return computedTasks.filter(t => {
      if (t.status === 'concluida') return false;
      const due = new Date(t.dueDate);
      return due.getTime() >= today.getTime() && due.getTime() <= endOfToday.getTime();
    });
  }, [computedTasks]);

  const getOverdueTasks = useCallback(() => {
    return computedTasks.filter(t => t.status === 'atrasada');
  }, [computedTasks]);

  const getPendingCountByProspect = useCallback((prospectId: string) => {
    return computedTasks.filter(
      t => (t.prospectId === String(prospectId) || t.prospectId === prospectId) && t.status !== 'concluida'
    ).length;
  }, [computedTasks]);

  return {
    tasks: computedTasks,
    addTask,
    updateTask,
    completeTask,
    deleteTask,
    getTasksByProspect,
    getTasksForToday,
    getOverdueTasks,
    getPendingCountByProspect
  };
}
