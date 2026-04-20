/**
 * Mapeamento de segmentos para ícones Lucide
 * Cada segmento tem um ícone associado para visualização
 */

import {
  Stethoscope,
  Wine,
  UtensilsCrossed,
  Building2,
  Briefcase,
  ShoppingCart,
  Home,
  Wrench,
  BookOpen,
  Zap,
  Pill,
  DollarSign,
  TrendingUp,
  Users,
  MessageSquare,
  Code,
  Palette,
  Music,
  Plane,
  Utensils,
  LucideIcon,
} from "lucide-react";

export const SEGMENT_ICONS: Record<string, LucideIcon> = {
  // Saúde
  "Clínica": Stethoscope,
  "Consultório": Stethoscope,
  "Hospital": Stethoscope,
  "Farmácia": Pill,
  "Laboratório": Pill,

  // Alimentação
  "Restaurante": UtensilsCrossed,
  "Bar": Wine,
  "Café": Utensils,
  "Padaria": UtensilsCrossed,
  "Pizzaria": UtensilsCrossed,

  // Comércio
  "Loja": ShoppingCart,
  "E-commerce": ShoppingCart,
  "Supermercado": ShoppingCart,
  "Boutique": ShoppingCart,

  // Imóvel
  "Imobiliária": Home,
  "Construção": Home,
  "Incorporadora": Home,

  // Serviços
  "Empresa": Building2,
  "Consultoria": Briefcase,
  "Agência": Briefcase,
  "Escritório": Building2,
  "Serviços": Wrench,
  "Manutenção": Wrench,
  "Limpeza": Wrench,

  // Educação
  "Escola": BookOpen,
  "Universidade": BookOpen,
  "Cursos": BookOpen,
  "Treinamento": BookOpen,

  // Tecnologia
  "Software": Code,
  "TI": Code,
  "Desenvolvimento": Code,
  "Startup": Zap,
  "Tech": Code,

  // Financeiro
  "Banco": DollarSign,
  "Financeira": DollarSign,
  "Investimentos": TrendingUp,
  "Seguros": DollarSign,

  // Recursos Humanos
  "RH": Users,
  "Recrutamento": Users,

  // Comunicação
  "Agência de Marketing": Palette,
  "Publicidade": Palette,
  "Comunicação": MessageSquare,
  "Mídia": MessageSquare,

  // Entretenimento
  "Música": Music,
  "Eventos": Music,
  "Produção": Music,

  // Turismo
  "Turismo": Plane,
  "Hotel": Plane,
  "Agência de Viagens": Plane,
};

/**
 * Obter ícone para um segmento
 * Se o segmento não estiver no mapa, retorna um ícone padrão (Building2)
 */
export function getSegmentIcon(segment: string): LucideIcon {
  return SEGMENT_ICONS[segment] || Building2;
}

/**
 * Cores associadas aos ícones de segmento
 */
export const SEGMENT_COLORS: Record<string, string> = {
  "Clínica": "text-red-400",
  "Consultório": "text-red-400",
  "Hospital": "text-red-400",
  "Farmácia": "text-red-400",
  "Laboratório": "text-red-400",

  "Restaurante": "text-orange-400",
  "Bar": "text-orange-400",
  "Café": "text-orange-400",
  "Padaria": "text-orange-400",
  "Pizzaria": "text-orange-400",

  "Loja": "text-blue-400",
  "E-commerce": "text-blue-400",
  "Supermercado": "text-blue-400",
  "Boutique": "text-blue-400",

  "Imobiliária": "text-amber-400",
  "Construção": "text-amber-400",
  "Incorporadora": "text-amber-400",

  "Empresa": "text-purple-400",
  "Consultoria": "text-purple-400",
  "Agência": "text-purple-400",
  "Escritório": "text-purple-400",
  "Serviços": "text-gray-400",
  "Manutenção": "text-gray-400",
  "Limpeza": "text-gray-400",

  "Escola": "text-green-400",
  "Universidade": "text-green-400",
  "Cursos": "text-green-400",
  "Treinamento": "text-green-400",

  "Software": "text-cyan-400",
  "TI": "text-cyan-400",
  "Desenvolvimento": "text-cyan-400",
  "Startup": "text-yellow-400",
  "Tech": "text-cyan-400",

  "Banco": "text-emerald-400",
  "Financeira": "text-emerald-400",
  "Investimentos": "text-emerald-400",
  "Seguros": "text-emerald-400",

  "RH": "text-pink-400",
  "Recrutamento": "text-pink-400",

  "Agência de Marketing": "text-indigo-400",
  "Publicidade": "text-indigo-400",
  "Comunicação": "text-indigo-400",
  "Mídia": "text-indigo-400",

  "Música": "text-rose-400",
  "Eventos": "text-rose-400",
  "Produção": "text-rose-400",

  "Turismo": "text-teal-400",
  "Hotel": "text-teal-400",
  "Agência de Viagens": "text-teal-400",
};

/**
 * Obter cor para um segmento
 * Se o segmento não estiver no mapa, retorna uma cor padrão (slate-400)
 */
export function getSegmentColor(segment: string): string {
  return SEGMENT_COLORS[segment] || "text-slate-400";
}
