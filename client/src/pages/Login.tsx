import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, AlertCircle, Briefcase } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar conta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Digite um nome de usuário");
      return;
    }

    if (!password.trim()) {
      toast.error("Digite uma senha");
      return;
    }

    if (isRegister) {
      if (!email.trim()) {
        toast.error("Digite um email");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Email inválido");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      if (password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }

      registerMutation.mutate({ username, email, password });
    } else {
      loginMutation.mutate({ username, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              CRM Vitti Soluções
            </CardTitle>
          </div>
          <CardDescription>
            {isRegister ? "Crie sua conta para acessar o sistema" : "Faça login para continuar"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label">
                Nome de Usuário
              </label>
              <Input
                type="text"
                placeholder="seu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-label">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-label">
                Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-label">
                  Confirmar Senha
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              ) : isRegister ? (
                <UserPlus className="w-4 h-4 mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isLoading ? "Processando..." : isRegister ? "Criar Conta" : "Entrar"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">ou</span>
            </div>
          </div>

          {!isRegister && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForgotPasswordOpen(true)}
              className="w-full text-primary"
            >
              Esqueci minha senha
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setIsRegister(!isRegister);
              setUsername("");
              setPassword("");
              setConfirmPassword("");
              setEmail("");
            }}
            disabled={isLoading}
            className="w-full"
          >
            {isRegister ? "Já tenho uma conta" : "Criar nova conta"}
          </Button>

          <div className="bg-muted rounded-lg p-3 flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {isRegister
                ? "Crie uma conta com seu nome de usuário e senha para acessar o CRM."
                : "Faça login com suas credenciais para acessar seu painel de controle."}
            </p>
          </div>

          <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
        </CardContent>
      </Card>
    </div>
  );
}
