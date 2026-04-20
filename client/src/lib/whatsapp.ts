/**
 * Formata um número de telefone para exibição na tabela
 * - 10 dígitos: (XX) XXXX-XXXX (fixo)
 * - 11 dígitos: (XX) XXXXX-XXXX (celular)
 * - Outro tamanho: retorna o valor bruto
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "-";

  // Remove caracteres especiais
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  // Outro tamanho: retorna bruto
  return phone;
}

/**
 * Formata um número de telefone brasileiro para o formato WhatsApp
 * Entrada: (11) 98765-4321 ou 11987654321 ou +55 11 98765-4321
 * Saída: 5511987654321
 * Agora mais tolerante: aceita 6-15 dígitos
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;

  // Remove todos os caracteres especiais: (), -, espaços, +
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Valida se tem entre 6 e 15 dígitos
  if (!/^\d{6,15}$/.test(cleaned)) {
    return null;
  }

  // Remove zeros à esquerda
  cleaned = cleaned.replace(/^0+/, "");

  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }

  return cleaned;
}

/**
 * Gera a URL do WhatsApp (wa.me) com número e mensagem
 * Retorna null se o telefone for inválido
 */
export function generateWhatsAppURL(
  phone: string,
  message?: string
): string | null {
  const formattedPhone = formatPhoneForWhatsApp(phone);

  const baseURL = "https://web.whatsapp.com/send?phone=";
  let url = baseURL + formattedPhone;

  if (message) {
    url += "&text=" + encodeURIComponent(message);
  }

  return url;
}

/**
 * Abre o WhatsApp Web em uma nova aba
 */
export function openWhatsApp(phone: string, message?: string): void {
  const url = generateWhatsAppURL(phone, message);

  if (url) {
    window.open(url, "_blank");
  }
}
