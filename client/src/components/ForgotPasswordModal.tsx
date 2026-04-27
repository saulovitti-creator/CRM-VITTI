import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requestPasswordReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setEmail("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Digite seu email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset.mutateAsync({ email });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Recuperar Senha</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Digite seu email para receber um link de recuperação
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="bg-muted border-border text-white placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
