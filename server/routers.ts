import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  getLeadNotes,
  createLeadNote,
  deleteLeadNote,
  clearAllLeads,
  getDb,
  getLeadCountByType,
  registerUser,
  getUserByUsername,
  updateLastSignedIn,
  getUserByEmail,
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updateUserPassword,
  moveLeadToFinalStatus,
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
  moveLeadsToColumn,
  getColumnLeadCount,
  getLeadsInColumn,
  createSystemNote,
  getTasks,
  createTask,
  completeTask,
  deleteTask,
  getFollowUpAlerts,
  getDashboardStats,
  deleteLeadsByIds,
} from "./db";
import { hashPassword, verifyPassword } from "./auth-utils";
import { groupDuplicates, mergeLeads, calculateDuplicateStats } from "./duplicates";
import { leads } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(64),
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existingUser = await getUserByUsername(input.username);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }

        const existingEmail = await getUserByEmail(input.email);
        if (existingEmail) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already exists",
          });
        }

        const passwordHash = hashPassword(input.password);
        let user;
        try {
          user = await registerUser(input.username, input.email, passwordHash);
        } catch (error: any) {
          console.error("[auth.register] registerUser threw error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Failed to create user",
          });
        }

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user: user object is null",
          });
        }

        const sessionData = JSON.stringify({
          id: user.id,
          username: user.username,
          role: user.role,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionData, cookieOptions);

        return { success: true, user };
      }),
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        const isValid = verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        await updateLastSignedIn(user.id);

        const sessionData = JSON.stringify({
          id: user.id,
          username: user.username,
          role: user.role,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionData, cookieOptions);

        return { success: true, user };
      }),
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
          await fetch(`${process.env.BUILT_IN_FORGE_API_URL}/email/send`, {
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
        } catch (error) {
          console.error('Erro ao enviar email:', error);
        }
        
        return { success: true, message: "Se o email existir, um link será enviado" };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const resetToken = await getValidPasswordResetToken(input.token);
        if (!resetToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token inválido ou expirado",
          });
        }

        const passwordHash = hashPassword(input.newPassword);
        await updateUserPassword(resetToken.userId, passwordHash);
        await markPasswordResetTokenAsUsed(resetToken.id);

        return { success: true, message: "Senha redefinida com sucesso" };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leads: router({
    list: protectedProcedure
      .input(
        z.object({
          searchTerm: z.string().optional(),
          segment: z.string().optional(),
          status: z.string().optional(),
          type: z.string().optional(),
          city: z.string().optional(),
          dataInicial: z.date().optional(),
          dataFinal: z.date().optional(),
          siteStatus: z.enum(['all', 'with_site', 'without_site']).optional(),
        })
      )
      .query(({ input }) => getLeads(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.id);
        if (!lead) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return lead;
      }),

    create: protectedProcedure
      .input(
        z.object({
          companyName: z.string().min(1),
          contactName: z.string().optional(),
          phone: z.string().min(6).max(20).refine(
            (val) => /\d{6,15}/.test(val.replace(/\D/g, '')),
            { message: "Telefone deve conter entre 6 e 15 dígitos" }
          ),
          email: z.string().email().or(z.literal("")).optional(),
          segment: z.string().min(1),
          status: z.enum([
            "Entrar em contato",
            "Contatado",
            "Não Respondeu",
            "Interessado",
            "Não possui Interesse",
            "Perdido",
            "Abandonado",
            "Ganho",
          ]).optional(),
          type: z.enum(["CRM", "Site"]).optional(),
          site: z.string().optional(),
          dataCriacao: z.date().optional(),
          city: z.string().optional(),
          implementationValue: z.string().or(z.number()).optional(),
          recurringValue: z.string().or(z.number()).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const processedInput: any = { ...input };
        if (processedInput.implementationValue !== undefined && typeof processedInput.implementationValue === 'string') {
          processedInput.implementationValue = parseFloat(processedInput.implementationValue) || null;
        }
        if (processedInput.recurringValue !== undefined && typeof processedInput.recurringValue === 'string') {
          processedInput.recurringValue = parseFloat(processedInput.recurringValue) || null;
        }
        return createLead(processedInput);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          companyName: z.string().min(1),
          contactName: z.string().optional(),
          phone: z.string().min(6).max(20).refine(
            (val) => /\d{6,15}/.test(val.replace(/\D/g, '')),
            { message: "Telefone deve conter entre 6 e 15 dígitos" }
          ),
          email: z.string().email().or(z.literal("")).optional(),
          segment: z.string().min(1),
          status: z.enum([
            "Entrar em contato",
            "Contatado",
            "Não Respondeu",
            "Interessado",
            "Não possui Interesse",
            "Perdido",
            "Abandonado",
            "Ganho",
          ]).optional(),
          type: z.enum(["CRM", "Site"]).optional(),
          site: z.string().optional(),
          city: z.string().optional(),
          implementationValue: z.string().or(z.number()).optional(),
          recurringValue: z.string().or(z.number()).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const processedUpdates: any = { ...updates };
        if (processedUpdates.implementationValue !== undefined && typeof processedUpdates.implementationValue === 'string') {
          processedUpdates.implementationValue = parseFloat(processedUpdates.implementationValue) || null;
        }
        if (processedUpdates.recurringValue !== undefined && typeof processedUpdates.recurringValue === 'string') {
          processedUpdates.recurringValue = parseFloat(processedUpdates.recurringValue) || null;
        }
        await updateLead(id, processedUpdates);
        return getLeadById(id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteLead(input.id)),

    deleteFiltered: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        if (input.ids.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum lead selecionado para apagar" });
        }
        return deleteLeadsByIds(input.ids);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          leadId: z.union([z.number(), z.string()]),
          status: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const leadId = typeof input.leadId === 'string' ? parseInt(input.leadId, 10) : input.leadId;
        const lead = await getLeadById(leadId);
        if (!lead) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lead nao encontrado",
          });
        }
        const oldStatus = lead.status;
        await updateLead(leadId, { status: input.status } as any);
        // Timeline: log automático de mudança de coluna
        if (oldStatus !== input.status) {
          const now = new Date().toLocaleString("pt-BR");
          await createSystemNote(leadId, `Status alterado de "${oldStatus}" para "${input.status}" em ${now}`);
        }
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ type: z.enum(["CRM", "Site"]).optional() }))
      .query(({ input }) => getLeadStats(input.type)),

    countByType: protectedProcedure
      .input(z.object({ type: z.enum(["CRM", "Site"]) }))
      .query(({ input }) => getLeadCountByType(input.type)),

    notes: router({
      list: protectedProcedure
        .input(z.object({ leadId: z.number() }))
        .query(({ input }) => getLeadNotes(input.leadId)),

      create: protectedProcedure
        .input(
          z.object({
            leadId: z.number(),
            content: z.string().min(1),
          })
        )
        .mutation(({ input }) => createLeadNote(input)),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteLeadNote(input.id)),
    }),

    logContact: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await getLeadById(input.leadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado" });
        
        // Atualiza a data do ultimo contato
        const now = new Date();
        await updateLead(input.leadId, { lastContactAt: now } as any);
        
        // Insere a nota no histórico
        await createLeadNote({
          leadId: input.leadId,
          content: `Mensagem enviada via WhatsApp em ${now.toLocaleString("pt-BR")}`,
        });
        
        return { success: true };
      }),

    addNote: protectedProcedure
      .input(
        z.object({
          leadId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(({ input }) => createLeadNote(input)),

    importLeads: protectedProcedure
      .input(
        z.object({
          leads: z.array(
            z.object({
              companyName: z.string().min(1),
              contactName: z.string().optional(),
              phone: z.string().min(6).max(20).refine(
                (val) => /\d{6,15}/.test(val.replace(/\D/g, '')),
                { message: "Telefone deve conter entre 6 e 15 dígitos" }
              ),
              email: z.string().email().or(z.literal("")).optional(),
              segment: z.string().min(1),
              status: z.string().optional(),
              site: z.string().optional(),
              city: z.string().optional(),
              notes: z.string().optional(),
            })
          ),
          type: z.enum(["CRM", "Site"]),
        })
      )
      .mutation(async ({ input }) => {
        const results: Array<{ rowIndex: number; company: string; status: string; error?: string }> = [];
        let successCount = 0;
        let errorCount = 0;

        const validStatuses = [
          "Entrar em contato",
          "Contatado",
          "Não Respondeu",
          "Interessado",
          "Não possui Interesse",
        ];

        // Conexão única - abrir uma vez fora do loop
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Loop com insert direto usando a conexão já aberta
        for (let i = 0; i < input.leads.length; i++) {
          const lead = input.leads[i];
          try {
            const statusValue = lead.status && validStatuses.includes(lead.status)
              ? lead.status
              : "Entrar em contato";

            // Insert direto sem chamar createLead
            await db.insert(leads).values({
              companyName: lead.companyName,
              contactName: lead.contactName || null,
              phone: lead.phone,
              email: lead.email || null,
              segment: lead.segment as any,
              status: statusValue as any,
              site: lead.site || null,
              city: lead.city || null,
              notes: lead.notes || null,
              type: input.type,
              motivoSaida: "",
            });

            successCount++;
            results.push({
              rowIndex: i + 2,
              company: lead.companyName,
              status: "success",
            });
          } catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            results.push({
              rowIndex: i + 2,
              company: lead.companyName,
              status: "error",
              error: errorMessage,
            });
            console.error(`Error importing lead at row ${i + 2}:`, error);
          }
        }

        return {
          successCount,
          errorCount,
          total: input.leads.length,
          results,
        };
      }),

    moveToFinalStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["Perdido", "Abandonado", "Ganho"]),
          valorFechado: z.number().positive().optional(),
          motivoSaida: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return moveLeadToFinalStatus(
          input.id,
          input.status,
          input.valorFechado,
          input.motivoSaida
        );
      }),

    clear: protectedProcedure
      .input(z.object({ confirm: z.boolean() }))
      .mutation(async ({ input }) => {
        if (!input.confirm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Confirmation required",
          });
        }
        await clearAllLeads();
        return { success: true };
      }),

    getUniqueSegments: protectedProcedure
      .input(z.object({ type: z.enum(["CRM", "Site"]).optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const query = db.selectDistinct({ segment: leads.segment })
          .from(leads)
          .where(input.type ? eq(leads.type, input.type) : undefined)
          .orderBy(leads.segment);
        const result = await query;
        return result.map((r: any) => r.segment).filter(Boolean);
      }),

    // Scanner de Duplicados
    scanDuplicates: protectedProcedure
      .input(z.object({ type: z.enum(["CRM", "Site"]) }))
      .query(async ({ input }) => {
        // Buscar todos os leads do tipo
        const allLeads = await getLeads({ type: input.type });
        
        // Agrupar duplicados
        const duplicateGroups = groupDuplicates(allLeads);
        
        return duplicateGroups;
      }),

    // Resolver duplicados em lote (1 clique)
    // Estratégias:
    // - KEEP_NEWEST: mantém o lead mais recente e remove o resto
    // - KEEP_OLDEST: mantém o lead mais antigo e remove o resto
    // - MERGE: mescla dados (mantém o mais recente como base) e remove o resto
    resolveAllDuplicates: protectedProcedure
      .input(
        z.object({
          type: z.enum(["CRM", "Site"]),
          strategy: z.enum(["KEEP_NEWEST", "KEEP_OLDEST", "MERGE"]),
        })
      )
      .mutation(async ({ input }) => {
        const allLeads = await getLeads({ type: input.type });
        const groups = groupDuplicates(allLeads);

        let groupsProcessed = 0;
        let leadsDeleted = 0;
        let leadsMerged = 0;

        for (const group of groups) {
          // Ordenar por data (mais recente primeiro)
          const sorted = [...group.leads].sort((a, b) => {
            const da = new Date(a.dataCriacao).getTime();
            const db = new Date(b.dataCriacao).getTime();
            return db - da;
          });

          if (input.strategy === "KEEP_OLDEST") {
            sorted.reverse();
          }

          const keepLead = sorted[0];
          const deleteIds = sorted.slice(1).map((l) => l.id);

          if (deleteIds.length === 0) {
            groupsProcessed += 1;
            continue;
          }

          if (input.strategy === "MERGE") {
            const mergedLead = mergeLeads(sorted);
            await updateLead(keepLead.id, {
              companyName: mergedLead.companyName,
              contactName: mergedLead.contactName || "",
              phone: mergedLead.phone,
              email: mergedLead.email || "",
              segment: mergedLead.segment,
              status: mergedLead.status,
              city: mergedLead.city || "",
              site: mergedLead.site || "",
              implementationValue: mergedLead.implementationValue,
              recurringValue: mergedLead.recurringValue,
            });
            leadsMerged += 1;
          }

          for (const id of deleteIds) {
            await deleteLead(id);
          }

          leadsDeleted += deleteIds.length;
          groupsProcessed += 1;
        }

        return {
          success: true,
          type: input.type,
          strategy: input.strategy,
          totalGroups: groups.length,
          groupsProcessed,
          leadsDeleted,
          leadsMerged,
        };
      }),

    // Mesclar leads duplicados
    mergeDuplicates: protectedProcedure
      .input(
        z.object({
          keepLeadId: z.number(),
          deleteLeadIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        // Buscar todos os leads envolvidos
        const allLeadIds = [input.keepLeadId, ...input.deleteLeadIds];
        const leadsToMerge = [];
        
        for (const id of allLeadIds) {
          const lead = await getLeadById(id);
          if (lead) leadsToMerge.push(lead);
        }
        
        if (leadsToMerge.length === 0) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Nenhum lead encontrado para mesclar" 
          });
        }
        
        // Mesclar leads
        const mergedLead = mergeLeads(leadsToMerge);
        
        // Atualizar lead principal com dados mesclados
        await updateLead(input.keepLeadId, {
          companyName: mergedLead.companyName,
          contactName: mergedLead.contactName || "",
          phone: mergedLead.phone,
          email: mergedLead.email || "",
          segment: mergedLead.segment,
          status: mergedLead.status,
          city: mergedLead.city || "",
          site: mergedLead.site || "",
          implementationValue: mergedLead.implementationValue,
          recurringValue: mergedLead.recurringValue,
        });
        
        // Deletar leads duplicados
        for (const id of input.deleteLeadIds) {
          await deleteLead(id);
        }
        
        return { success: true, mergedLeadId: input.keepLeadId };
      }),

    // Deletar múltiplos leads
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await deleteLead(id);
        }
        return { success: true, deletedCount: input.ids.length };
      }),
  }),
  columns: router({
    list: protectedProcedure.query(async () => {
      return getKanbanColumns();
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(50),
          color: z.string().regex(/^#[0-9A-F]{6}$/i),
          description: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return createKanbanColumn(input);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).max(50).optional(),
          color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
          description: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateKanbanColumn(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteKanbanColumn(input.id);
      }),
    reorder: protectedProcedure
      .input(z.object({ columnIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        return reorderKanbanColumns(input.columnIds);
      }),
    moveLeads: protectedProcedure
      .input(
        z.object({
          fromColumnName: z.string(),
          toColumnName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return moveLeadsToColumn(input.fromColumnName, input.toColumnName);
      }),
    getLeadCount: protectedProcedure
      .input(z.object({ columnName: z.string() }))
      .query(async ({ input }) => {
        return getColumnLeadCount(input.columnName);
      }),
    getLeadsInColumn: protectedProcedure
      .input(z.object({ columnName: z.string() }))
      .query(async ({ input }) => {
        return getLeadsInColumn(input.columnName);
      }),
  }),
  tasks: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number().optional() }))
      .query(({ input }) => getTasks(input.leadId)),
    create: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        title: z.string().min(1).max(120),
        description: z.string().max(300).optional(),
        dueDate: z.date(),
        priority: z.enum(["baixa", "media", "alta"]).optional(),
      }))
      .mutation(({ input }) => createTask(input)),
    complete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => completeTask(input.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTask(input.id)),
  }),
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ 
        type: z.enum(["CRM", "Site"]).optional(),
        dataInicial: z.date().optional(),
        dataFinal: z.date().optional()
      }))
      .query(({ input }) => getDashboardStats(input.type, input.dataInicial, input.dataFinal)),
    followUpAlerts: protectedProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(({ input }) => getFollowUpAlerts(input.days)),
  }),
});

export type AppRouter = typeof appRouter;
