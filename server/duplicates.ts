import type { Lead } from "../drizzle/schema";

/**
 * Tipo para representar um lead normalizado
 */
export interface NormalizedLead extends Lead {
  normalizedName: string;
  normalizedPhone: string;
}

/**
 * Tipo para representar um grupo de leads duplicados
 */
export interface DuplicateGroup {
  key: string; // Chave única do grupo (ex: "name:hospital sao lucas")
  type: "name" | "phone"; // Tipo de duplicação
  value: string; // Valor normalizado (nome ou telefone)
  leads: Lead[]; // Array de leads duplicados
  count: number; // Quantidade de duplicados
}

/**
 * Normaliza um lead para comparação
 * - Remove acentos do nome
 * - Converte para lowercase
 * - Remove espaços extras
 * - Extrai apenas dígitos do telefone
 */
export function normalizeLead(lead: Lead): NormalizedLead {
  // Normalizar nome: lowercase, sem acentos, sem espaços extras
  const normalizedName = lead.companyName
    .toLowerCase()
    .normalize("NFD") // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove marcas diacríticas (acentos)
    .replace(/\s+/g, " ") // Substitui múltiplos espaços por um único
    .trim();

  // Normalizar telefone: apenas dígitos, remover DDI (55) se existir
  let normalizedPhone = lead.phone.replace(/\D/g, "");
  // Se começa com 55 (DDI Brasil), remover
  if (normalizedPhone.startsWith("55") && normalizedPhone.length > 10) {
    normalizedPhone = normalizedPhone.substring(2);
  }
  // Se vazio ou muito curto, manter como está
  if (normalizedPhone.length < 6) {
    normalizedPhone = lead.phone.replace(/\D/g, "");
  }

  return {
    ...lead,
    normalizedName,
    normalizedPhone,
  };
}

/**
 * Agrupa leads duplicados por nome OU telefone
 * Retorna apenas grupos com 2 ou mais leads
 */
export function groupDuplicates(leads: Lead[]): DuplicateGroup[] {
  // Map para armazenar grupos por chave única
  const groups = new Map<string, Lead[]>();

  // Processar cada lead
  for (const lead of leads) {
    const normalized = normalizeLead(lead);

    // Criar chaves únicas para nome e telefone
    const nameKey = `name:${normalized.normalizedName}`;
    const phoneKey = `phone:${normalized.normalizedPhone}`;

    // Agrupar por nome (se não estiver vazio)
    if (normalized.normalizedName) {
      if (!groups.has(nameKey)) {
        groups.set(nameKey, []);
      }
      groups.get(nameKey)!.push(lead);
    }

    // Agrupar por telefone (se não estiver vazio e for diferente do nome)
    if (normalized.normalizedPhone && phoneKey !== nameKey) {
      if (!groups.has(phoneKey)) {
        groups.set(phoneKey, []);
      }
      groups.get(phoneKey)!.push(lead);
    }
  }

  // Filtrar apenas grupos com 2+ leads
  const candidateGroups: DuplicateGroup[] = [];

  for (const [key, groupLeads] of Array.from(groups.entries())) {
    if (groupLeads.length >= 2) {
      const [type, value] = key.split(":");
      candidateGroups.push({
        key,
        type: type as "name" | "phone",
        value,
        leads: groupLeads,
        count: groupLeads.length,
      });
    }
  }

  // Mesclar grupos que compartilham leads (para evitar duplicação)
  const mergedGroups: DuplicateGroup[] = [];
  const processedLeadIds = new Set<number>();

  for (const group of candidateGroups) {
    // Verificar se algum lead deste grupo já foi processado
    const hasProcessedLead = group.leads.some((lead) =>
      processedLeadIds.has(lead.id)
    );

    if (!hasProcessedLead) {
      // Encontrar todos os grupos que compartilham leads com este
      const relatedLeadIds = new Set(group.leads.map((l) => l.id));
      const allRelatedLeads = new Set(group.leads);

      // Procurar outros grupos que compartilham leads
      for (const otherGroup of candidateGroups) {
        if (otherGroup.key === group.key) continue;

        const sharesLead = otherGroup.leads.some((lead) =>
          relatedLeadIds.has(lead.id)
        );

        if (sharesLead) {
          otherGroup.leads.forEach((lead) => {
            allRelatedLeads.add(lead);
            relatedLeadIds.add(lead.id);
          });
        }
      }

      // Criar grupo mesclado com key única baseada nos IDs dos leads
      const mergedLeads = Array.from(allRelatedLeads);
      const uniqueKey = `merged:${group.type}:${mergedLeads.map((l) => l.id).sort().join("_")}`;
      mergedGroups.push({
        key: uniqueKey,
        type: group.type,
        value: group.value,
        leads: mergedLeads,
        count: mergedLeads.length,
      });

      // Marcar todos os leads como processados
      mergedLeads.forEach((lead) => processedLeadIds.add(lead.id));
    }
  }

  // Ordenar por quantidade de duplicados (maior primeiro)
  mergedGroups.sort((a, b) => b.count - a.count);

  return mergedGroups;
}

/**
 * Mescla múltiplos leads em um único lead
 * Estratégia: mantém o lead mais recente como base e preenche campos vazios com dados dos outros
 */
export function mergeLeads(leads: Lead[]): Lead {
  if (leads.length === 0) {
    throw new Error("Cannot merge empty array of leads");
  }

  if (leads.length === 1) {
    return leads[0];
  }

  // Ordenar por data de criação (mais recente primeiro)
  const sorted = [...leads].sort(
    (a, b) =>
      new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
  );

  // Lead base (mais recente)
  const base = sorted[0];

  // Função auxiliar para pegar primeiro valor não vazio
  const firstNonEmpty = (field: keyof Lead): any => {
    for (const lead of sorted) {
      const value = lead[field];
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
    return base[field];
  };

  // Observações não existem no schema, removido

  // Retornar lead mesclado
  return {
    ...base,
    contactName: firstNonEmpty("contactName"),
    email: firstNonEmpty("email"),
    segment: firstNonEmpty("segment"),
    site: firstNonEmpty("site"),
    city: firstNonEmpty("city"),
    // observations removido (não existe no schema)
    implementationValue: firstNonEmpty("implementationValue"),
    recurringValue: firstNonEmpty("recurringValue"),
  };
}

/**
 * Calcula estatísticas de duplicados
 */
export function calculateDuplicateStats(groups: DuplicateGroup[]) {
  const totalGroups = groups.length;
  const totalDuplicates = groups.reduce((sum, g) => sum + g.count, 0);
  const totalUnique = groups.length; // Cada grupo representa 1 lead único após resolução
  const toRemove = totalDuplicates - totalUnique;

  return {
    totalGroups,
    totalDuplicates,
    totalUnique,
    toRemove,
  };
}
