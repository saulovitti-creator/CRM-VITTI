/**
 * currency.ts
 *
 * Utilities for BRL currency parsing/formatting.
 */

/**
 * Normalize currency text into backend decimal format.
 * Examples:
 * - "R$ 1.500,50" -> "1500.50"
 * - "1500,50" -> "1500.50"
 * - "1500.50" -> "1500.50"
 * - "20.000.000,00" -> "20000000.00"
 */
export function parseCurrency(value: string | number): string {
  if (value === null || value === undefined) return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const cleaned = trimmed.replace(/[^\d,.-]/g, "");
  if (!cleaned) return "";

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      const [intPart, decPart] = cleaned.split(".");
      // In BR input, a single dot with 3 digits after is usually a thousand separator.
      if (decPart && decPart.length === 3) {
        normalized = `${intPart}${decPart}`;
      }
    }
  }

  let sign = "";
  let body = normalized;

  if (body.startsWith("-")) {
    sign = "-";
    body = body.slice(1);
  }

  body = body.replace(/[^0-9.]/g, "");
  const firstDot = body.indexOf(".");
  if (firstDot >= 0) {
    body = body.slice(0, firstDot + 1) + body.slice(firstDot + 1).replace(/\./g, "");
  }

  const finalValue = `${sign}${body}`;
  if (!finalValue || finalValue === "-" || finalValue === ".") return "";
  return finalValue;
}

/**
 * Format a raw value into BRL display format.
 */
export function formatCurrency(value: string | number): string {
  if (value === null || value === undefined || value === "") return "";

  const normalized = parseCurrency(value);
  if (!normalized) return "";

  const [rawIntegerPart, rawDecimalPart = ""] = normalized.split(".");
  let integerPart = rawIntegerPart.replace(/\D/g, "");
  const decimalPart = rawDecimalPart.replace(/\D/g, "").slice(0, 2);

  if (!integerPart) integerPart = "0";

  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  let result = `R$ ${integerPart}`;
  if (rawDecimalPart.length > 0) {
    result += `,${decimalPart}`;
  }

  return result;
}
