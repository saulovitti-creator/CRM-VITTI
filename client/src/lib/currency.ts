/**
 * currency.ts
 *
 * Utilitários para formatação e parsing de moeda padrão BRL.
 */

/**
 * Remove qualquer formatação (símbolos, espaços, pontos de milhar) e converte vírgula para ponto.
 * Mantém apenas os dígitos numéricos e um único ponto decimal, caso exista,
 * garantindo que a string resultante seja um float válido ou uma string limpa para o backend.
 *
 * @param value String bruta vinda do input (ex: "R$ 1.500,50" ou "1.500")
 * @returns String contendo o valor puro (ex: "1500.50" ou "1500")
 */
export function parseCurrency(value: string | number): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  
  // Extrai apenas dígitos e vírgula
  const clean = stringValue.replace(/[^\d,]/g, "");
  
  // Troca a vírgula pelo ponto para padrão numérico de banco de dados
  return clean.replace(",", ".");
}

/**
 * Recebe um número (ou string pura) e formata para o padrão visual R$ 1.500,50.
 *
 * @param value Valor bruto (ex: "1500", "1500.50", ou número 1500)
 * @returns String formatada (ex: "R$ 1.500", "R$ 1.500,50")
 */
export function formatCurrency(value: string | number): string {
  if (value === null || value === undefined || value === "") return "";
  
  let stringValue = String(value);

  // Se o valor já vier do banco com ponto como separador decimal (ex: "1500.50")
  if (stringValue.includes('.')) {
    stringValue = stringValue.replace('.', ',');
  }
  
  // Separa a parte inteira da parte decimal
  const parts = stringValue.split(',');
  
  // Remove tudo que não for dígito da parte inteira
  let integerPart = parts[0].replace(/\D/g, "");
  
  // Se houver parte decimal, pegamos apenas os 2 primeiros dígitos
  let decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, "").substring(0, 2) : "";

  // Se não sobrar nada, retorna string vazia
  if (!integerPart && !decimalPart && stringValue !== ",") return "";

  // Aplica os pontos de milhar na parte inteira (ex: "1500000" -> "1.500.000")
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  } else if (stringValue.startsWith(",")) {
    // Se digitou apenas vírgula, assume "0"
    integerPart = "0";
  }

  let result = "";
  if (integerPart) {
    result = `R$ ${integerPart}`;
  } else {
    // Caso de ter acabado de apagar o último dígito, mas não quer perder o R$
    return "";
  }

  // Anexa a vírgula se ela foi digitada ou se existe parte decimal
  if (parts.length > 1) {
    result += `,${decimalPart}`;
  }

  return result;
}
