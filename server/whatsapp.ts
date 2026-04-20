/**
 * Formata um número de telefone brasileiro para o formato WhatsApp
 * Entrada: (11) 98765-4321 ou 11987654321 ou +55 11 98765-4321
 * Saída: 5511987654321
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;

  // Remove todos os caracteres especiais: (), -, espaços, +
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Remove zeros à esquerda
  cleaned = cleaned.replace(/^0+/, "");

  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }

  // Valida se tem exatamente 13 dígitos (55 + DDD + 9 dígitos)
  if (cleaned.length !== 13 || !/^\d+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Gera a URL do WhatsApp (wa.me) com número e mensagem
 */
export function generateWhatsAppURL(
  phone: string,
  message?: string
): string | null {
  const formattedPhone = formatPhoneForWhatsApp(phone);

  if (!formattedPhone) {
    return null;
  }

  const baseURL = "https://wa.me/";
  let url = baseURL + formattedPhone;

  if (message) {
    url += "?text=" + encodeURIComponent(message);
  }

  return url;
}
