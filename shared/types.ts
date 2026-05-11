/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * Commercial segment type - now a free text field.
 */
export type CommercialSegment = string;

/**
 * Opportunity stage/status labels used by the legacy kanban helpers.
 */
export type OpportunityStageStatus =
  | "Entrar em contato"
  | "Contatado"
  | "Não Respondeu"
  | "Interessado"
  | "Não possui Interesse"
  | "Perdido"
  | "Abandonado"
  | "Ganho";

/**
 * Final Status type - for tracking exit from funnel
 */
export type FinalStatus = "perdido" | "abandonado" | "ganho";

/**
 * Legacy status helpers.
 * DEPRECATED: prefer pipeline stages from the database for new code.
 */
export const OPPORTUNITY_STAGE_STATUSES: OpportunityStageStatus[] = [
  "Entrar em contato",
  "Contatado",
  "Não Respondeu",
  "Interessado",
  "Não possui Interesse",
];

/**
 * Final statuses (exit from funnel)
 */
export const FINAL_STATUSES: FinalStatus[] = ["perdido", "abandonado", "ganho"];

/**
 * Kanban status columns (all statuses including final)
 */
export const KANBAN_STATUSES: OpportunityStageStatus[] = [
  "Entrar em contato",
  "Contatado",
  "Não Respondeu",
  "Interessado",
  "Não possui Interesse",
  "Perdido",
  "Abandonado",
  "Ganho",
];

/**
 * Status colors for UI (badges)
 */
export const STATUS_COLORS: Record<OpportunityStageStatus, string> = {
  "Entrar em contato": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  "Contatado": "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  "Não Respondeu": "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  "Interessado": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  "Não possui Interesse": "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  "Perdido": "bg-red-500/20 text-red-400 border border-red-500/30",
  "Abandonado": "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  "Ganho": "bg-green-500/20 text-green-400 border border-green-500/30",
};

/**
 * Kanban board colors for status columns
 */
export const KANBAN_COLORS: Record<OpportunityStageStatus, { bg: string; text: string; border: string }> = {
  "Entrar em contato": { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" },
  "Contatado": { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" },
  "Não Respondeu": { bg: "bg-slate-500", text: "text-white", border: "border-slate-600" },
  "Interessado": { bg: "bg-green-500", text: "text-white", border: "border-green-600" },
  "Não possui Interesse": { bg: "bg-gray-500", text: "text-white", border: "border-gray-600" },
  "Perdido": { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
  "Abandonado": { bg: "bg-gray-500", text: "text-white", border: "border-gray-600" },
  "Ganho": { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" },
};

/**
 * Segment colors for UI - deprecated, segments are now dynamic
 */
export const SEGMENT_COLORS: Record<string, string> = {
  "Clínica": "bg-purple-100 text-purple-900 border border-purple-300",
  "Bar": "bg-orange-100 text-orange-900 border border-orange-300",
  "Restaurante": "bg-pink-100 text-pink-900 border border-pink-300",
  "Empresa": "bg-blue-100 text-blue-900 border border-blue-300",
};

// Backward compatibility for older modules/scripts that still import the old names.
export type LeadSegment = CommercialSegment;
export type LeadStatus = OpportunityStageStatus;
export const LEAD_CATEGORIES: string[] = ["Clínica", "Bar", "Restaurante", "Empresa"];
export const LEAD_STATUSES = OPPORTUNITY_STAGE_STATUSES;
export const CATEGORY_COLORS = SEGMENT_COLORS;
