import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-900 border-cyan-500/30">
        <CardHeader className="text-center space-y-2">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.jpg" alt="Logo" className="h-[72px] w-auto object-contain mb-2 rounded-lg" />
            <CardTitle className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRM Vitti Soluções
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Gerenciamento de Prospectos Premium
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Nome de Usuário
              </label>
              <Input
                type="text"
                placeholder="seu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Confirmar Senha
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
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
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">ou</span>
            </div>
          </div>

          {!isRegister && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForgotPasswordOpen(true)}
              className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/50"
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
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-200"
          >
            {isRegister ? "Já tenho uma conta" : "Criar nova conta"}
          </Button>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
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
