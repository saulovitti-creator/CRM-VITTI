import { MessageCircle } from "lucide-react";
import { openWhatsApp, formatPhoneForWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface WhatsAppButtonProps {
  phone: string;
  contactId?: number;
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "text";
}

export function WhatsAppButton({
  phone,
  contactId,
  message,
  size = "sm",
  variant = "icon",
}: WhatsAppButtonProps) {
  const isValidPhone = formatPhoneForWhatsApp(phone) !== null;
  if (!isValidPhone) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openWhatsApp(phone, message);
  };

  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`${sizeClasses[size]} flex items-center justify-center rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 group`}
        title="Enviar mensagem via WhatsApp"
      >
        <MessageCircle className={`${iconSizes[size]} group-hover:scale-110 transition-transform`} />
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      size="sm"
      className="bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      WhatsApp
    </Button>
  );
}
