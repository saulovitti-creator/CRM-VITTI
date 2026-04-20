    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true, message: "Se o email existir, um link será enviado" };
        }

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await createPasswordResetToken(user.id, token, 0.25);

        const resetUrl = `${process.env.VITE_OAUTH_PORTAL_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        
        try {
          const emailResponse = await fetch(`${process.env.BUILT_IN_FORGE_API_URL}/email/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: user.email,
              subject: 'Recuperação de Senha - CRM Prospect VLI',
              html: `<h2>Recuperação de Senha</h2><p>Clique no link para redefinir sua senha (válido por 15 minutos):</p><a href="${resetUrl}">Redefinir Senha</a>`,
            }),
          });

          if (!emailResponse.ok) {
            console.error('Erro ao enviar email:', await emailResponse.text());
          }
        } catch (error) {
          console.error('Erro ao enviar email:', error);
        }
        
        return { success: true, message: "Se o email existir, um link será enviado" };
      }),
