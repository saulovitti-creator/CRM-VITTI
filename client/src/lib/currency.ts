/**
 * currency.ts
 *
 * Helpers for the CRM currency contract:
 * - database/backend: decimal reais as string, e.g. "10000.00"
 * - user input: Brazilian currency text, e.g. "10.000,00"
 * - display: formatted BRL, e.g. "R$ 10.000,00"
 */

function sanitizeCurrencyText(value: string | number): string {
  return String(value).trim().replace(/[^\d,.-]/g, "");
}

function cleanupDecimalString(value: string): string {
  let sign = "";
  let body = value;

  if (body.startsWith("-")) {
    sign = "-";
    body = body.slice(1);
  }

  body = body.replace(/[^0-9.]/g, "");
  const firstDot = body.indexOf(".");
  if (firstDot >= 0) {
    body = body.slice(0, firstDot + 1) + body.slice(firstDot + 1).replace(/\./g, "");
  }

  const [integerPart, decimalPart] = body.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";

  if (decimalPart !== undefined) {
    return `${sign}${normalizedInteger}.${decimalPart.slice(0, 2)}`;
  }

  return `${sign}${normalizedInteger}`;
}

/**
 * Normalizes values coming from the database/backend.
 * A database value like "10000.00" must stay "10000.00", not become cents.
 */
export function normalizeDatabaseCurrencyToDecimal(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";

  const cleaned = sanitizeCurrencyText(value);
  if (!cleaned) return "";

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return cleanupDecimalString(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (cleaned.includes(",")) {
    return cleanupDecimalString(cleaned.replace(/\./g, "").replace(",", "."));
  }

  return cleanupDecimalString(cleaned);
}

/**
 * Parses what the user typed as reais, accepting common Brazilian formats.
 */
export function parseUserCurrencyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";

  const cleaned = sanitizeCurrencyText(value);
  if (!cleaned) return "";

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma) {
    return cleanupDecimalString(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (dotCount > 1) {
      return cleanupDecimalString(cleaned.replace(/\./g, ""));
    }

    const [integerPart, decimalPart = ""] = cleaned.split(".");

    if (decimalPart.length === 0) {
      return cleanupDecimalString(integerPart);
    }

    if (decimalPart.length <= 2) {
      return cleanupDecimalString(cleaned);
    }

    return cleanupDecimalString(`${integerPart}${decimalPart}`);
  }

  return cleanupDecimalString(cleaned);
}

/**
 * Backward-compatible alias used by existing form code.
 */
export const parseCurrency = parseUserCurrencyInput;

/**
 * Formats decimal reais into BRL display text.
 */
export function formatCurrencyBRL(value: string | number | null | undefined): string {
  const normalized = normalizeDatabaseCurrencyToDecimal(value);
  if (!normalized) return "";

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Backward-compatible alias used by existing UI code.
 */
export const formatCurrency = formatCurrencyBRL;
