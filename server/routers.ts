import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getDb,
  registerUser,
  getUserByUsername,
  updateLastSignedIn,
  getUserByEmail,
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updateUserPassword,
  getFollowUpAlerts,
  getDashboardStats,
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
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
import { tags, contacts, pipelines, pipelineStages, contactTags, opportunities } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, inArray, or, and, asc } from "drizzle-orm";

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

  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ 
        pipelineId: z.number().optional(),
        dataInicial: z.date().optional(),
        dataFinal: z.date().optional()
      }))
      .query(({ input }) => getDashboardStats(input.pipelineId, input.dataInicial, input.dataFinal)),
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

  // ===================== IMPORTAÇÃO COMERCIAL INTELIGENTE =====================
  import: router({
    bulkImport: protectedProcedure
      .input(z.object({
        mode: z.enum(["contacts_only", "contacts_and_opportunities"]),
        rows: z.array(z.object({
          // Bloco A — Contato
          nome: z.string().optional(),
          empresa: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          segmento: z.string().optional(),
          cidade: z.string().optional(),
          // Bloco B — Oportunidade
          nomeDaOportunidade: z.string().optional(),
          pipeline: z.string().optional(),
          estagioInicial: z.string().optional(),
          valorEstimado: z.string().optional(),
          origem: z.string().optional(),
          tags: z.string().optional(),
          observacoes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { isAuthDisabled } = await import("./auth-utils");
        const bypassActive = isAuthDisabled();

        // ── Debug Logs Temporários ──
        console.log("[Import] AUTH_DISABLED:", process.env.AUTH_DISABLED);
        console.log("[Import] VITE_AUTH_DISABLED:", process.env.VITE_AUTH_DISABLED);
        console.log("[Import] bypassActive:", bypassActive);
        console.log("[Import] ctx.user.role:", ctx.user?.role);

        // ── RBAC mínimo: apenas admin pode importar no MVP ──
        if (!bypassActive && (!ctx.user || (ctx.user as any).role !== "admin")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem importar dados.",
          });
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { mode, rows } = input;

        // ── Pré-carregar dados de referência ──
        const allPipelines = await db.select().from(pipelines);
        const allStages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.displayOrder));
        const allTags = await db.select().from(tags);
        const allContacts = await db.select({
          id: contacts.id,
          phone: contacts.phone,
          email: contacts.email,
        }).from(contacts);

        // ── Helpers de normalização ──
        const normalize = (s?: string | null) => (s || "").trim().toLowerCase();
        const normalizePhone = (s?: string | null) => (s || "").replace(/\D/g, "").trim();
        const parseMonetaryValue = (val?: string | null): number | "INVALID" | null => {
          if (!val || val.trim() === "") return null;
          const s = val.trim();
          // Aceita apenas dígitos, opcionalmente seguidos por exatamente um ponto ou uma vírgula e mais dígitos.
          if (!/^\d+([.,]\d+)?$/.test(s)) return "INVALID";
          const num = parseFloat(s.replace(",", "."));
          if (isNaN(num) || num < 0) return "INVALID";
          return num;
        };

        // ── Processar cada linha ──
        type LineResult = {
          rowIndex: number;
          status: "success" | "error" | "skipped";
          errors: string[];
          alerts: string[];
          contactId?: number;
          contactCreated?: boolean;
          opportunityId?: number;
        };

        const results: LineResult[] = [];
        let contactsCreated = 0;
        let contactsReused = 0;
        let opportunitiesCreated = 0;
        let linesWithError = 0;
        let linesSkipped = 0;
        let tagsIgnored = 0;

        // Track newly-created contacts within this import batch
        const batchContacts: { id: number; phone: string; email: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowIndex = i + 2; // Excel row (header = 1)
          const errors: string[] = [];
          const alerts: string[] = [];

          // ── 1. Ignorar linhas 100% vazias ──
          const allEmpty = Object.values(row).every(v => !v || v.trim() === "");
          if (allEmpty) {
            linesSkipped++;
            continue; // Silenciosamente ignorada
          }

          // ── 2. Validar campos obrigatórios de contato ──
          const nome = row.nome?.trim() || "";
          const empresa = row.empresa?.trim() || "";
          const telefone = row.telefone?.trim() || "";
          const email = row.email?.trim() || "";

          if (!nome && !empresa) {
            errors.push("Nome e Empresa estão vazios. Pelo menos um é obrigatório.");
          }
          if (!telefone && !email) {
            errors.push("Telefone e Email estão vazios. Pelo menos um é obrigatório.");
          }

          // ── 3. Validar campos de oportunidade (se modo 2) ──
          let resolvedPipelineId: number | null = null;
          let resolvedStageId: number | null = null;
          let parsedMonetaryValue: number | null = null;

          if (mode === "contacts_and_opportunities") {
            const pipelineName = row.pipeline?.trim() || "";
            if (!pipelineName) {
              errors.push("Pipeline é obrigatório no modo Contatos + Oportunidades.");
            } else {
              // Buscar pipeline por nome (case-insensitive, trim)
              const normalizedPipeName = normalize(pipelineName);
              const matchingPipelines = allPipelines.filter(p => normalize(p.name) === normalizedPipeName);

              if (matchingPipelines.length === 0) {
                errors.push(`Pipeline "${pipelineName}" não encontrado.`);
              } else if (matchingPipelines.length > 1) {
                errors.push(`Mais de um pipeline compatível com "${pipelineName}". Corrija o cadastro dos pipelines.`);
              } else {
                resolvedPipelineId = matchingPipelines[0].id;

                // Resolver estágio
                const estagioName = row.estagioInicial?.trim() || "";
                const pipeStages = allStages.filter(s => s.pipelineId === resolvedPipelineId);

                if (!estagioName) {
                  // Fallback: primeiro estágio ativo
                  const activeStage = pipeStages.find(s => s.isActiveInFunnel !== false);
                  if (activeStage) {
                    resolvedStageId = activeStage.id;
                    alerts.push(`Estágio vazio: será usado "${activeStage.name}".`);
                  } else {
                    errors.push(`Nenhum estágio ativo encontrado no pipeline "${pipelineName}".`);
                  }
                } else {
                  const normalizedStageName = normalize(estagioName);
                  const matchingStages = pipeStages.filter(s => normalize(s.name) === normalizedStageName);
                  
                  if (matchingStages.length === 0) {
                    errors.push(`Estágio "${estagioName}" não encontrado no pipeline "${pipelineName}".`);
                  } else if (matchingStages.length > 1) {
                    errors.push(`Estágio ambíguo: mais de um estágio compatível com "${estagioName}" foi encontrado no pipeline "${pipelineName}". Corrija os estágios antes de importar.`);
                  } else {
                    resolvedStageId = matchingStages[0].id;
                  }
                }
              }
            }

            // Validar valor estimado
            const valResult = parseMonetaryValue(row.valorEstimado);
            if (valResult === "INVALID") {
              errors.push(`Valor estimado "${row.valorEstimado}" é inválido. Use apenas números, exemplo: 1500, 1500.00 ou 1500,00. Não use R$, pontos de milhar ou texto.`);
            } else {
              parsedMonetaryValue = valResult;
            }
          }

          // ── 4. Se houver erro bloqueante, pular a linha inteira antes de iniciar transação ──
          if (errors.length > 0) {
            linesWithError++;
            results.push({ rowIndex, status: "error", errors, alerts });
            continue;
          }

          // ── 5. Buscar/reutilizar contato (telefone → email) ──
          let contactId: number | null = null;
          let contactExisted = false;
          const phoneNorm = normalizePhone(telefone);
          const emailNorm = normalize(email);

          // Verifica no DB existente
          if (phoneNorm) {
            const match = allContacts.find(c => normalizePhone(c.phone) === phoneNorm);
            if (match) contactId = match.id;
            if (!contactId) {
              const batchMatch = batchContacts.find(c => normalizePhone(c.phone) === phoneNorm);
              if (batchMatch) contactId = batchMatch.id;
            }
          }
          if (!contactId && emailNorm) {
            const match = allContacts.find(c => normalize(c.email) === emailNorm);
            if (match) contactId = match.id;
            if (!contactId) {
              const batchMatch = batchContacts.find(c => normalize(c.email) === emailNorm);
              if (batchMatch) contactId = batchMatch.id;
            }
          }

          if (contactId) {
            contactExisted = true;
            alerts.push("Contato já existente reutilizado.");
          }

          // ── 6. Resolver tag a ser aplicada ao contato ──
          const tagName = row.tags?.trim() || "";
          let matchingTagId: number | null = null;
          if (tagName) {
            const normalizedTagName = normalize(tagName);
            const matchingTag = allTags.find(t => normalize(t.name) === normalizedTagName);
            if (matchingTag) {
              matchingTagId = matchingTag.id;
            } else {
              alerts.push(`Tag "${tagName}" não encontrada. Registro importado sem essa tag.`);
              tagsIgnored++;
            }
          }

          // ── 7. Transação Segura Por Linha (DB Insert) ──
          try {
            const txResult = await db.transaction(async (tx) => {
              let txContactId = contactId;
              let txContactCreated = false;

              // A. Criar contato se não existia
              if (!txContactId) {
                const [result] = await tx.insert(contacts).values({
                  name: nome || empresa,
                  company: empresa || undefined,
                  phone: telefone || undefined,
                  email: email || undefined,
                  segment: row.segmento?.trim() || undefined,
                  city: row.cidade?.trim() || undefined,
                  source: row.origem?.trim() || undefined,
                }).$returningId();
                txContactId = result.id;
                txContactCreated = true;
              }

              // B. Aplicar Tag usando 'tx'
              if (matchingTagId && txContactId) {
                const existing = await tx.select().from(contactTags)
                  .where(and(eq(contactTags.contactId, txContactId), eq(contactTags.tagId, matchingTagId)))
                  .limit(1);
                if (existing.length === 0) {
                  await tx.insert(contactTags).values({ contactId: txContactId, tagId: matchingTagId });
                }
              }

              // C. Criar Oportunidade usando 'tx'
              let txOpportunityId: number | undefined;
              if (mode === "contacts_and_opportunities" && resolvedPipelineId && resolvedStageId && txContactId) {
                const oppTitle = row.nomeDaOportunidade?.trim() || `Venda - ${empresa || nome}`;
                const result = await tx.insert(opportunities).values({
                  contactId: txContactId,
                  pipelineId: resolvedPipelineId,
                  stageId: resolvedStageId,
                  title: oppTitle,
                  monetaryValue: parsedMonetaryValue !== null ? parsedMonetaryValue.toString() : undefined,
                  source: row.origem?.trim() || undefined,
                  notes: row.observacoes?.trim() || undefined,
                  segment: row.segmento?.trim() || undefined,
                });
                const insertedId = (result as any)[0]?.insertId ?? (result as any).insertId;
                txOpportunityId = insertedId;
              }

              return {
                contactId: txContactId,
                contactCreated: txContactCreated,
                opportunityId: txOpportunityId,
              };
            });

            // Se a transação deu commit, salvamos o progresso
            if (txResult.contactCreated && txResult.contactId) {
              contactsCreated++;
              batchContacts.push({ id: txResult.contactId, phone: telefone, email: email });
            } else if (contactExisted) {
              contactsReused++;
            }
            if (txResult.opportunityId) opportunitiesCreated++;

            results.push({
              rowIndex,
              status: "success",
              errors,
              alerts,
              contactId: txResult.contactId,
              contactCreated: txResult.contactCreated,
              opportunityId: txResult.opportunityId,
            });

          } catch (e: any) {
            // Se falhou dentro da transação, TUDO dessa linha foi revertido (inclusive o contato recém-criado)
            errors.push(`Erro na gravação (transação abortada): ${e.message}`);
            linesWithError++;
            results.push({ rowIndex, status: "error", errors, alerts });
          }
        }

        return {
          summary: {
            totalRows: rows.length,
            linesProcessed: results.length,
            linesSkipped,
            linesWithError,
            contactsCreated,
            contactsReused,
            opportunitiesCreated,
            tagsIgnored,
          },
          results,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
