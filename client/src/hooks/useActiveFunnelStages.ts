import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface UseActiveFunnelStagesOptions {
  type?: "contact" | "opportunity";
  pipelineId?: string | number;
  currentStatusOrId?: string | number | null;
}

export interface FunnelStage {
  id: string | number;
  name: string;
  color?: string | null;
}

export function useActiveFunnelStages({ type = "opportunity", pipelineId, currentStatusOrId }: UseActiveFunnelStagesOptions) {
  // Query: Opportunities (pipeline_stages)
  const { 
    data: pipelines, 
    isLoading: loadingPipelines, 
    error: errorPipelines 
  } = trpc.pipelines.list.useQuery();

  const stages = useMemo<FunnelStage[]>(() => {
    if (!pipelines || !pipelineId) return [];
    
    const pipeline = pipelines.find(p => p.id.toString() === pipelineId.toString());
    if (!pipeline || !pipeline.stages) return [];

    return pipeline.stages
      .filter(stage => stage.isActiveInFunnel !== false || stage.id.toString() === currentStatusOrId?.toString())
      .map(stage => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
      }));
  }, [pipelines, pipelineId, currentStatusOrId]);

  return {
    stages,
    isLoading: loadingPipelines,
    error: errorPipelines,
  };
}
