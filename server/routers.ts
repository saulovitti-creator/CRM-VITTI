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
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  assignTagToLead,
  removeTagFromLead,
  getTagsByLeadId,
  getCustomFieldDefinitions,
  getCustomFieldDefinitionById,
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
  reorderCustomFieldDefinitions,
  getCustomFieldValues,
  setCustomFieldValues,
  deleteCustomFieldValuesForEntity,
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getUniqueContactCities,
  getUniqueContactSegments,
  getAllPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  moveOpportunityToStage,
  getOpportunityNotes,
  createOpportunityNote,
  deleteOpportunityNote,
  getOpportunityTasks,
  createOpportunityTask,
  completeOpportunityTask,
  deleteOpportunityTask,
  getOpportunityStats,
} from "./db";
import { hashPassword, verifyPassword } from "./auth-utils";
import { groupDuplicates, mergeLeads, calculateDuplicateStats } from "./duplicates";
import { leads, tags, leadTags, contacts } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, inArray, or } from "drizzle-orm";

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
          tagIds: z.array(z.number()).optional(),
        })
      )
      .query(async ({ input }) => {
        const fetchedLeads = await getLeads(input);
        
        if (fetchedLeads.length === 0) return fetchedLeads;
        
        const db = await getDb();
        if (!db) return fetchedLeads;

        const leadIds = fetchedLeads.map((l: { id: number }) => l.id);
        const tagsData = await db.select({
          leadId: leadTags.leadId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt
        })
        .from(leadTags)
        .innerJoin(tags, eq(leadTags.tagId, tags.id))
        .where(inArray(leadTags.leadId, leadIds));

        const tagsByLeadId: Record<number, any[]> = {};
        tagsData.forEach(row => {
          if (!tagsByLeadId[row.leadId]) tagsByLeadId[row.leadId] = [];
          tagsByLeadId[row.leadId].push({
            id: row.id,
            name: row.name,
            color: row.color,
            createdAt: row.createdAt
          });
        });

        return fetchedLeads.map((lead: any) => ({
          ...lead,
          tags: tagsByLeadId[lead.id] || []
        }));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.id);
        if (!lead) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        const leadTags = await getTagsByLeadId(input.id);
        
        return {
          ...lead,
          tags: leadTags
        };
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
          tagIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { tagIds, ...data } = input;
        const processedInput: any = { ...data };
        if (processedInput.implementationValue !== undefined && typeof processedInput.implementationValue === 'string') {
          processedInput.implementationValue = parseFloat(processedInput.implementationValue) || null;
        }
        if (processedInput.recurringValue !== undefined && typeof processedInput.recurringValue === 'string') {
          processedInput.recurringValue = parseFloat(processedInput.recurringValue) || null;
        }
        
        const result = await createLead(processedInput);
        let leadId: number | null = null;
        
        if (result && typeof result === 'object') {
          if ('id' in result && typeof result.id === 'number') {
            leadId = result.id;
          } else if ('insertId' in result) {
            leadId = (result as any).insertId;
          }
        }
        
        if (leadId && tagIds && tagIds.length > 0) {
          for (const tagId of tagIds) {
            await assignTagToLead(leadId, tagId);
          }
        }
        
        return result;
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
          tagIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, tagIds, ...updates } = input;
        const processedUpdates: any = { ...updates };
        if (processedUpdates.implementationValue !== undefined && typeof processedUpdates.implementationValue === 'string') {
          processedUpdates.implementationValue = parseFloat(processedUpdates.implementationValue) || null;
        }
        if (processedUpdates.recurringValue !== undefined && typeof processedUpdates.recurringValue === 'string') {
          processedUpdates.recurringValue = parseFloat(processedUpdates.recurringValue) || null;
        }
        
        const result = await updateLead(id, processedUpdates);
        
        if (tagIds !== undefined) {
          const currentTags = await getTagsByLeadId(id);
          const currentTagIds = currentTags.map((t: any) => t.id);
          
          const tagsToRemove = currentTagIds.filter((tagId: number) => !tagIds.includes(tagId));
          const tagsToAdd = tagIds.filter((tagId: number) => !currentTagIds.includes(tagId));
          
          for (const tagId of tagsToRemove) {
            await removeTagFromLead(id, tagId);
          }
          
          for (const tagId of tagsToAdd) {
            await assignTagToLead(id, tagId);
          }
        }
        
        return result;
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
  tags: router({
    list: protectedProcedure.query(() => getAllTags()),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(7).optional().default("#3b82f6")
      }))
      .mutation(({ input }) => createTag(input)),
      
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(7).optional()
      }))
      .mutation(({ input }) => updateTag(input.id, { name: input.name, color: input.color })),
      
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTag(input.id)),
      
    assignToLead: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        tagId: z.number()
      }))
      .mutation(({ input }) => assignTagToLead(input.leadId, input.tagId)),
      
    removeFromLead: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        tagId: z.number()
      }))
      .mutation(({ input }) => removeTagFromLead(input.leadId, input.tagId)),
      
    getByLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(({ input }) => getTagsByLeadId(input.leadId)),
  }),

  // ===================== CUSTOM FIELDS =====================
  customFields: router({
    // --- Definitions CRUD ---
    listDefinitions: protectedProcedure
      .input(z.object({ model: z.string().optional() }).optional())
      .query(({ input }) => getCustomFieldDefinitions(input?.model)),

    createDefinition: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        fieldType: z.enum(["text", "textarea", "number", "currency", "date", "dropdown", "checkbox", "url", "email", "phone"]),
        model: z.string().default("lead"),
        groupName: z.string().max(100).optional(),
        placeholder: z.string().max(255).optional(),
        options: z.string().optional(), // JSON array as string
        isRequired: z.boolean().optional().default(false),
        displayOrder: z.number().optional(),
      }))
      .mutation(({ input }) => createCustomFieldDefinition(input)),

    updateDefinition: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        fieldType: z.enum(["text", "textarea", "number", "currency", "date", "dropdown", "checkbox", "url", "email", "phone"]).optional(),
        groupName: z.string().max(100).nullable().optional(),
        placeholder: z.string().max(255).nullable().optional(),
        options: z.string().nullable().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return updateCustomFieldDefinition(id, updates);
      }),

    deleteDefinition: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteCustomFieldDefinition(input.id)),

    reorderDefinitions: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(({ input }) => reorderCustomFieldDefinitions(input.orderedIds)),

    // --- Values ---
    getValues: protectedProcedure
      .input(z.object({
        entityId: z.number(),
        entityType: z.string().default("lead"),
      }))
      .query(({ input }) => getCustomFieldValues(input.entityId, input.entityType)),

    setValues: protectedProcedure
      .input(z.object({
        entityId: z.number(),
        entityType: z.string().default("lead"),
        values: z.array(z.object({
          definitionId: z.number(),
          value: z.string().nullable(),
        })),
      }))
      .mutation(({ input }) => setCustomFieldValues(input.entityId, input.entityType, input.values)),
  }),

  // ===================== SPRINT 3: CONTACTS =====================
  contacts: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        city: z.string().optional(),
        segment: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
      }).optional())
      .query(({ input }) => getContacts(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getContactById(input.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        site: z.string().optional(),
        segment: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (db) {
          const conditions = [];
          if (input.email && input.email.trim() !== "") {
            conditions.push(eq(contacts.email, input.email));
          }
          if (input.phone && input.phone.trim() !== "") {
            conditions.push(eq(contacts.phone, input.phone));
          }
          
          if (conditions.length > 0) {
            const duplicates = await db.select().from(contacts).where(or(...conditions)).limit(1);
            if (duplicates.length > 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Um contato com este e-mail ou telefone já existe na base.",
              });
            }
          }
        }
        return createContact(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        site: z.string().optional(),
        segment: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateContact(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteContact(input.id)),

    getCities: protectedProcedure
      .query(() => getUniqueContactCities()),

    getSegments: protectedProcedure
      .query(() => getUniqueContactSegments()),
  }),

  // ===================== SPRINT 3: PIPELINES =====================
  pipelines: router({
    list: protectedProcedure
      .query(() => getAllPipelines()),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getPipelineById(input.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        stages: z.array(z.object({
          name: z.string().min(1),
          color: z.string().optional(),
          isFinal: z.boolean().optional(),
          finalType: z.string().nullable().optional(),
        })),
      }))
      .mutation(({ input }) => createPipeline(input)),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePipeline(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePipeline(input.id)),

    // --- Stages ---
    createStage: protectedProcedure
      .input(z.object({
        pipelineId: z.number(),
        name: z.string().min(1),
        color: z.string().optional(),
        displayOrder: z.number().optional(),
        isFinal: z.boolean().optional(),
        finalType: z.string().nullable().optional(),
      }))
      .mutation(({ input }) => createPipelineStage(input)),

    updateStage: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().optional(),
        displayOrder: z.number().optional(),
        isFinal: z.boolean().optional(),
        finalType: z.string().nullable().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePipelineStage(id, data);
      }),

    deleteStage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePipelineStage(input.id)),

    reorderStages: protectedProcedure
      .input(z.object({
        pipelineId: z.number(),
        stageIds: z.array(z.number()),
      }))
      .mutation(({ input }) => reorderPipelineStages(input.pipelineId, input.stageIds)),
  }),

  // ===================== SPRINT 3: OPPORTUNITIES =====================
  opportunities: router({
    list: protectedProcedure
      .input(z.object({
        pipelineId: z.number().optional(),
        stageId: z.number().optional(),
        contactId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ input }) => getOpportunities(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOpportunityById(input.id)),

    create: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        pipelineId: z.number(),
        stageId: z.number(),
        title: z.string().min(1),
        monetaryValue: z.string().nullable().optional(),
        segment: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const sanitized: any = {
          contactId: input.contactId,
          pipelineId: input.pipelineId,
          stageId: input.stageId,
          title: input.title,
        };
        // monetaryValue: string vazia → undefined (campo DECIMAL não aceita "")
        if (input.monetaryValue && input.monetaryValue.trim() !== "") {
          sanitized.monetaryValue = input.monetaryValue;
        }
        // Campos opcionais: string vazia → undefined
        if (input.segment && input.segment.trim() !== "") sanitized.segment = input.segment;
        if (input.source && input.source.trim() !== "") sanitized.source = input.source;
        if (input.notes && input.notes.trim() !== "") sanitized.notes = input.notes;

        return createOpportunity(sanitized);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        contactId: z.number().optional(),
        pipelineId: z.number().optional(),
        stageId: z.number().optional(),
        title: z.string().optional(),
        monetaryValue: z.string().nullable().optional(),
        status: z.string().optional(),
        segment: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        // Sanitizar monetaryValue: string vazia → null
        if (data.monetaryValue !== undefined && data.monetaryValue !== null && data.monetaryValue.trim() === "") {
          data.monetaryValue = null;
        }
        return updateOpportunity(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOpportunity(input.id)),

    moveToStage: protectedProcedure
      .input(z.object({
        id: z.number(),
        stageId: z.number(),
      }))
      .mutation(({ input }) => moveOpportunityToStage(input.id, input.stageId)),

    stats: protectedProcedure
      .input(z.object({ pipelineId: z.number().optional() }).optional())
      .query(({ input }) => getOpportunityStats(input?.pipelineId)),

    // --- Notes ---
    getNotes: protectedProcedure
      .input(z.object({ opportunityId: z.number() }))
      .query(({ input }) => getOpportunityNotes(input.opportunityId)),

    addNote: protectedProcedure
      .input(z.object({
        opportunityId: z.number(),
        content: z.string().min(1),
        noteType: z.string().optional(),
      }))
      .mutation(({ input }) => createOpportunityNote(input)),

    deleteNote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOpportunityNote(input.id)),

    // --- Tasks ---
    getTasks: protectedProcedure
      .input(z.object({ opportunityId: z.number() }))
      .query(({ input }) => getOpportunityTasks(input.opportunityId)),

    createTask: protectedProcedure
      .input(z.object({
        opportunityId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.date(),
        priority: z.string().optional(),
      }))
      .mutation(({ input }) => createOpportunityTask(input)),

    completeTask: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => completeOpportunityTask(input.id)),

    deleteTask: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteOpportunityTask(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
