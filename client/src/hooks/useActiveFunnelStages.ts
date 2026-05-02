import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UseActiveFunnelStagesOptions {
  type: "lead" | "opportunity";
  pipelineId?: string | number;
  currentStatusOrId?: string | number | null;
}

export interface FunnelStage {
  id: string | number;
  name: string;
  color?: string | null;
}

export function useActiveFunnelStages({ type, pipelineId, currentStatusOrId }: UseActiveFunnelStagesOptions) {
  // Query 1: Leads (Legacy kanban_columns)
  const { 
    data: columns, 
    isLoading: loadingColumns, 
    error: errorColumns 
  } = trpc.columns.list.useQuery(undefined, {
    enabled: type === "lead"
  });

  // Query 2: Opportunities (pipeline_stages)
  const { 
    data: pipelines, 
    isLoading: loadingPipelines, 
    error: errorPipelines 
  } = trpc.pipelines.list.useQuery(undefined, {
    enabled: type === "opportunity"
  });

  const stages = useMemo<FunnelStage[]>(() => {
    if (type === "lead") {
      if (!columns) return [];
      
      return columns
        .filter(col => col.isActiveInFunnel !== false || col.name === currentStatusOrId)
        .map(col => ({
          id: col.name, // Leads use name as the status identifier
          name: col.name,
          color: col.color,
        }));
    }

    if (type === "opportunity") {
      if (!pipelines || !pipelineId) return [];
      
      const pipeline = pipelines.find(p => p.id.toString() === pipelineId.toString());
      if (!pipeline || !pipeline.stages) return [];

      return pipeline.stages
        .filter(stage => stage.isActiveInFunnel !== false || stage.id.toString() === currentStatusOrId?.toString())
        .map(stage => ({
          id: stage.id, // Opportunities use stageId
          name: stage.name,
          color: stage.color,
        }));
    }

    return [];
  }, [type, columns, pipelines, pipelineId, currentStatusOrId]);

  return {
    stages,
    isLoading: type === "lead" ? loadingColumns : loadingPipelines,
    error: type === "lead" ? errorColumns : errorPipelines,
  };
}
