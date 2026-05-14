import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
  searchContactsForSelect,
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
  setOpportunityOutcome,
  getClosedOpportunities,
  reopenOpportunity,
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

const MAX_IMPORT_ROWS = 1000;
const OPPORTUNITY_MONETARY_MAX = 99_999_999.99;

function normalizeMonetaryInput(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  // Casos BR comuns:
  // - "1.500,00" => "1500.00"
  // - "1500,00" => "1500.00"
  // - "1500.00" => "1500.00"
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      const [intPart, decPart] = cleaned.split(".");
      if (decPart && decPart.length === 3) {
        normalized = `${intPart}${decPart}`;
      }
    }
  }

  // Mantem apenas digitos, um ponto decimal e sinal negativo inicial opcional.
  let sign = "";
  let body = normalized;
  if (body.startsWith("-")) {
    sign = "-";
    body = body.slice(1);
  }
  body = body.replace(/[^0-9.]/g, "");
  const firstDot = body.indexOf(".");
  if (firstDot >= 0) {
    body = body.slice(0, firstDot + 1) + body.slice(firstDot + 1).replace(/\./g, "");
  }

  const finalValue = `${sign}${body}`;
  if (!finalValue || finalValue === "-" || finalValue === ".") return null;

  const numericValue = Number(finalValue);
  if (!Number.isFinite(numericValue)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Valor monetario invalido.",
    });
  }

  if (Math.abs(numericValue) > OPPORTUNITY_MONETARY_MAX) {
    // Temporary compatibility for stale clients that still send currency in cents
    // (for example, 1000000000 for R$ 10.000.000,00). The long-term contract is
    // decimal reais as a string, matching opportunities.monetaryValue DECIMAL(10,2).
    const legacyCentsPayload = !hasComma && !hasDot && /^-?\d+$/.test(cleaned) && cleaned.endsWith("00");
    const centsAsDecimal = numericValue / 100;

    if (legacyCentsPayload && Math.abs(centsAsDecimal) <= OPPORTUNITY_MONETARY_MAX) {
      return centsAsDecimal.toFixed(2);
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Valor monetario excede o limite suportado.",
    });
  }

  return finalValue;
}

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
        model: z.enum(["contact", "opportunity"]).default("contact"),
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
        entityType: z.string().default("contact"),
      }))
      .query(({ input }) => getCustomFieldValues(input.entityId, input.entityType)),

    setValues: protectedProcedure
      .input(z.object({
        entityId: z.number(),
        entityType: z.string().default("contact"),
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

    search: protectedProcedure
      .input(z.object({
        query: z.string().trim(),
        limit: z.number().int().min(1).max(30).optional(),
      }))
      .query(({ input }) => {
        if (input.query.length < 2) return [];
        return searchContactsForSelect(input);
      }),

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
          title: input.title.trim(),
        };
        // monetaryValue normalizado para formato decimal compatível com DECIMAL
        const normalizedMonetary = normalizeMonetaryInput(input.monetaryValue);
        if (normalizedMonetary !== undefined && normalizedMonetary !== null) {
          sanitized.monetaryValue = normalizedMonetary;
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
        if (data.title !== undefined) {
          data.title = data.title.trim();
        }
        if (data.monetaryValue !== undefined) {
          data.monetaryValue = normalizeMonetaryInput(data.monetaryValue);
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

    setOutcome: protectedProcedure
      .input(z.object({
        opportunityId: z.number(),
        outcome: z.enum(["won", "lost", "abandoned"]),
        reason: z.string().trim().min(1, "Justificativa obrigatoria.").max(500),
      }))
      .mutation(async ({ input }) => {
        try {
          return await setOpportunityOutcome(input.opportunityId, input.outcome, input.reason);
        } catch (error: any) {
          if (String(error?.message || "").includes("nao encontrada")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Oportunidade nao encontrada.",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Falha ao finalizar oportunidade.",
          });
        }
      }),

    closedList: protectedProcedure
      .input(z.object({
        pipelineId: z.number().optional(),
        status: z.enum(["won", "lost", "abandoned"]).optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ input }) => getClosedOpportunities(input)),

    reopen: protectedProcedure
      .input(z.object({
        opportunityId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await reopenOpportunity(input.opportunityId);
        } catch (error: any) {
          const message = String(error?.message || "");
          if (message.includes("nao encontrada")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Oportunidade nao encontrada.",
            });
          }
          if (message.includes("Nao foi possivel reabrir")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Falha ao reabrir oportunidade.",
          });
        }
      }),

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
    bulkImport: adminProcedure
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
        })).max(MAX_IMPORT_ROWS, `A importação aceita no máximo ${MAX_IMPORT_ROWS} linhas por arquivo.`),
      }))
      .mutation(async ({ input }) => {
        try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Banco de dados indisponível para processar a importação.",
          });
        }

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

        // ── Helpers de normalização (Fase 1) ──

        /** Remove espaços extras no início/fim e colapsa espaços duplicados internos. */
        const normalizeText = (s?: string | null): string => {
          if (!s) return "";
          return s.trim().replace(/\s+/g, " ");
        };

        /** Lowercase + trim. Para comparação de lookup (pipeline, estágio, tag). */
        const normalizeLookupName = (s?: string | null): string => normalizeText(s).toLowerCase();

        /** Remove espaços e converte para lowercase. */
        const normalizeEmail = (s?: string | null): string => {
          if (!s) return "";
          return s.replace(/\s/g, "").toLowerCase();
        };

        /** Remove tudo que não é dígito. */
        const normalizePhoneFn = (s?: string | null): string => {
          if (!s) return "";
          return s.replace(/\D/g, "");
        };

        /**
         * Parser monetário brasileiro seguro.
         * Aceita: 1500, 1500.00, 1500,00, 1.500, 1.500,00, R$ 1.500,00
         * Bloqueia: negativos, "abc", "1,500.00", "1.500.00", "1,2,3"
         */
        const parseBrazilianMoney = (val?: string | null): { value: number | null; error?: string; transformed?: string } => {
          if (!val || val.trim() === "") return { value: null };
          let s = val.trim();

          // Remover prefixo R$ (case-insensitive)
          s = s.replace(/^r\$\s*/i, "").trim();
          if (!s) return { value: null };

          // Bloquear negativos
          if (s.startsWith("-")) return { value: null, error: `Valor estimado "${val.trim()}" é inválido (negativo). Use apenas valores positivos.` };

          // Bloquear letras (exceto R$ já removido)
          if (/[a-zA-Z]/.test(s)) return { value: null, error: `Valor estimado "${val.trim()}" é inválido. Use exemplos como 1500, 1500,00 ou R$ 1.500,00.` };

          const hasDot = s.includes(".");
          const hasComma = s.includes(",");

          // Bloquear formato internacional ambíguo: "1,500.00"
          if (hasComma && hasDot && s.indexOf(",") < s.indexOf(".")) {
            return { value: null, error: `Valor estimado "${val.trim()}" é ambíguo (formato internacional?). Use o formato brasileiro: 1.500,00.` };
          }

          // Bloquear múltiplas vírgulas: "1,2,3"
          if ((s.match(/,/g) || []).length > 1) {
            return { value: null, error: `Valor estimado "${val.trim()}" é inválido (múltiplas vírgulas).` };
          }

          // Bloquear ponto seguido de ponto sem vírgula decimal: "1.500.00"
          if (hasDot && !hasComma) {
            const dotParts = s.split(".");
            if (dotParts.length > 2) {
              return { value: null, error: `Valor estimado "${val.trim()}" é inválido (múltiplos pontos sem vírgula decimal).` };
            }
            // "1.500" → milhar (3 dígitos após ponto); "1500.00" → decimal
            if (dotParts.length === 2 && dotParts[1].length === 3) {
              // Ponto como milhar: "1.500" → 1500
              const num = parseFloat(s.replace(/\./g, ""));
              if (isNaN(num) || num < 0) return { value: null, error: `Valor estimado "${val.trim()}" é inválido.` };
              return { value: num, transformed: `"${val.trim()}" → ${num}` };
            }
            // Ponto como decimal: "1500.00" → 1500, "1500.5" → 1500.5
            const num = parseFloat(s);
            if (isNaN(num) || num < 0) return { value: null, error: `Valor estimado "${val.trim()}" é inválido.` };
            return { value: num, transformed: val.trim() !== String(num) ? `"${val.trim()}" → ${num}` : undefined };
          }

          // Formato brasileiro com vírgula decimal: "1.500,00" ou "1500,00"
          if (hasComma) {
            const clean = s.replace(/\./g, "").replace(",", ".");
            const num = parseFloat(clean);
            if (isNaN(num) || num < 0) return { value: null, error: `Valor estimado "${val.trim()}" é inválido.` };
            return { value: num, transformed: `"${val.trim()}" → ${num}` };
          }

          // Apenas dígitos: "1500"
          const num = parseFloat(s);
          if (isNaN(num) || num < 0) return { value: null, error: `Valor estimado "${val.trim()}" é inválido.` };
          return { value: num };
        };

        const formatDecimalCurrency = (value: number): string => value.toFixed(2);

        const parseBrazilianMoneyV2 = (val?: string | null): { value: string | null; error?: string; transformed?: string } => {
          if (!val || val.trim() === "") return { value: null };
          const original = val.trim();
          let s = original.replace(/^r\$\s*/i, "").trim();
          if (!s) return { value: null };

          if (s.startsWith("-")) {
            return { value: null, error: `Valor estimado "${original}" invalido (negativo). Use apenas valores positivos.` };
          }
          if (/[a-zA-Z]/.test(s)) {
            return { value: null, error: `Valor estimado "${original}" invalido. Use exemplos como 1500, 1500,00 ou R$ 1.500,00.` };
          }

          const hasDot = s.includes(".");
          const hasComma = s.includes(",");
          if (hasComma && hasDot && s.indexOf(",") < s.indexOf(".")) {
            return { value: null, error: `Valor estimado "${original}" ambiguo (formato internacional). Use o formato brasileiro: 1.500,00.` };
          }
          if ((s.match(/,/g) || []).length > 1) {
            return { value: null, error: `Valor estimado "${original}" invalido (multiplas virgulas).` };
          }

          let numericValue: number;
          if (hasDot && !hasComma) {
            const dotParts = s.split(".");
            if (dotParts.length > 2) {
              return { value: null, error: `Valor estimado "${original}" invalido (multiplos pontos sem virgula decimal).` };
            }
            numericValue = dotParts.length === 2 && dotParts[1].length === 3
              ? parseFloat(s.replace(/\./g, ""))
              : parseFloat(s);
          } else if (hasComma) {
            numericValue = parseFloat(s.replace(/\./g, "").replace(",", "."));
          } else {
            numericValue = parseFloat(s);
          }

          if (!Number.isFinite(numericValue) || numericValue < 0) {
            return { value: null, error: `Valor estimado "${original}" invalido.` };
          }
          if (numericValue > OPPORTUNITY_MONETARY_MAX) {
            return { value: null, error: `Valor estimado "${original}" excede o limite suportado de R$ 99.999.999,99.` };
          }

          const normalizedValue = formatDecimalCurrency(numericValue);
          return {
            value: normalizedValue,
            transformed: original !== normalizedValue ? `"${original}" -> ${normalizedValue}` : undefined,
          };
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

        const pipelineBucketsByName = new Map<string, Array<(typeof allPipelines)[number]>>();
        for (const pipeline of allPipelines) {
          const key = normalizeLookupName(pipeline.name);
          const bucket = pipelineBucketsByName.get(key) ?? [];
          bucket.push(pipeline);
          pipelineBucketsByName.set(key, bucket);
        }

        const stagesByPipelineId = new Map<number, Array<(typeof allStages)[number]>>();
        const stageBucketsByPipelineId = new Map<number, Map<string, Array<(typeof allStages)[number]>>>();
        const firstActiveStageByPipelineId = new Map<number, (typeof allStages)[number]>();
        for (const stage of allStages) {
          const stageList = stagesByPipelineId.get(stage.pipelineId) ?? [];
          stageList.push(stage);
          stagesByPipelineId.set(stage.pipelineId, stageList);

          const stageMap = stageBucketsByPipelineId.get(stage.pipelineId) ?? new Map<string, Array<(typeof allStages)[number]>>();
          const stageKey = normalizeLookupName(stage.name);
          const stageBucket = stageMap.get(stageKey) ?? [];
          stageBucket.push(stage);
          stageMap.set(stageKey, stageBucket);
          stageBucketsByPipelineId.set(stage.pipelineId, stageMap);

          if (!firstActiveStageByPipelineId.has(stage.pipelineId) && stage.isActiveInFunnel !== false) {
            firstActiveStageByPipelineId.set(stage.pipelineId, stage);
          }
        }

        const tagIdsByName = new Map<string, Array<number>>();
        for (const tag of allTags) {
          const key = normalizeLookupName(tag.name);
          const bucket = tagIdsByName.get(key) ?? [];
          bucket.push(tag.id);
          tagIdsByName.set(key, bucket);
        }

        const contactIdByPhone = new Map<string, number>();
        const contactIdByEmail = new Map<string, number>();
        for (const contact of allContacts) {
          const phoneKey = normalizePhoneFn(contact.phone);
          const emailKey = normalizeEmail(contact.email);
          if (phoneKey && !contactIdByPhone.has(phoneKey)) contactIdByPhone.set(phoneKey, contact.id);
          if (emailKey && !contactIdByEmail.has(emailKey)) contactIdByEmail.set(emailKey, contact.id);
        }

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

          // ── 2. Normalizar e validar campos de contato ──
          const nome = normalizeText(row.nome);
          const empresa = normalizeText(row.empresa);
          const segmento = normalizeText(row.segmento);
          const cidade = normalizeText(row.cidade);
          const origem = normalizeText(row.origem);
          const observacoes = normalizeText(row.observacoes);

          // Telefone: normalizar (remover máscara)
          const rawPhone = (row.telefone || "").trim();
          const telefone = normalizePhoneFn(rawPhone);
          if (rawPhone && telefone && rawPhone !== telefone) {
            alerts.push(`Telefone "${rawPhone}" normalizado para "${telefone}".`);
          }
          if (telefone && telefone.length < 8) {
            alerts.push(`Telefone "${telefone}" parece curto (${telefone.length} dígitos).`);
          }

          // Email: normalizar (lowercase, sem espaços)
          const rawEmail = (row.email || "").trim();
          const email = normalizeEmail(rawEmail);
          if (rawEmail && email && rawEmail !== email) {
            alerts.push(`Email "${rawEmail}" normalizado para "${email}".`);
          }

          if (!nome && !empresa) {
            errors.push("Nome e Empresa estão vazios. Pelo menos um é obrigatório.");
          }
          if (!telefone && !email) {
            errors.push("Telefone e Email estão vazios. Pelo menos um é obrigatório.");
          }

          // ── 3. Validar campos de oportunidade (se modo 2) ──
          let resolvedPipelineId: number | null = null;
          let resolvedStageId: number | null = null;
          let parsedMonetaryValue: string | null = null;

          if (mode === "contacts_and_opportunities") {
            const pipelineName = normalizeText(row.pipeline);
            if (!pipelineName) {
              errors.push("Pipeline é obrigatório no modo Contatos + Oportunidades.");
            } else {
              // Buscar pipeline por nome (normalizeLookupName)
              const normalizedPipeName = normalizeLookupName(pipelineName);
              const matchingPipelines = pipelineBucketsByName.get(normalizedPipeName) ?? [];

              if (matchingPipelines.length === 0) {
                errors.push(`Pipeline "${pipelineName}" não encontrado.`);
              } else if (matchingPipelines.length > 1) {
                errors.push(`Mais de um pipeline compatível com "${pipelineName}". Corrija o cadastro dos pipelines.`);
              } else {
                resolvedPipelineId = matchingPipelines[0].id;

                // Resolver estágio
                const estagioName = normalizeText(row.estagioInicial);

                if (!estagioName) {
                  // Fallback: primeiro estágio ativo
                  const activeStage = firstActiveStageByPipelineId.get(resolvedPipelineId);
                  if (activeStage) {
                    resolvedStageId = activeStage.id;
                    alerts.push(`Estágio vazio: será usado "${activeStage.name}".`);
                  } else {
                    errors.push(`Nenhum estágio ativo encontrado no pipeline "${pipelineName}".`);
                  }
                } else {
                  const normalizedStageName = normalizeLookupName(estagioName);
                  const matchingStages = stageBucketsByPipelineId.get(resolvedPipelineId)?.get(normalizedStageName) ?? [];
                  
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

            // Validar valor estimado com parser brasileiro
            const moneyResult = parseBrazilianMoneyV2(row.valorEstimado);
            if (moneyResult.error) {
              errors.push(moneyResult.error);
            } else {
              parsedMonetaryValue = moneyResult.value;
              if (moneyResult.transformed) {
                alerts.push(`Valor estimado ${moneyResult.transformed}.`);
              }
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
          // telefone e email já estão normalizados na seção 2

          // Verifica no DB existente
          if (telefone) {
            contactId = contactIdByPhone.get(telefone) ?? null;
          }
          if (!contactId && email) {
            contactId = contactIdByEmail.get(email) ?? null;
          }

          if (contactId) {
            contactExisted = true;
            alerts.push("Contato já existente reutilizado.");
          }

          // ── 6. Resolver tag a ser aplicada ao contato ──
          const tagName = normalizeText(row.tags);
          let matchingTagId: number | null = null;
          if (tagName) {
            const normalizedTagName = normalizeLookupName(tagName);
            const matchingTagIds = tagIdsByName.get(normalizedTagName) ?? [];
            if (matchingTagIds.length === 1) {
              matchingTagId = matchingTagIds[0];
            } else if (matchingTagIds.length > 1) {
              errors.push(`Tag ambigua: mais de uma tag compativel com "${tagName}" foi encontrada.`);
            } else {
              alerts.push(`Tag "${tagName}" não encontrada. Registro importado sem essa tag.`);
              tagsIgnored++;
            }
          }

          // ── 7. Transação Segura Por Linha (DB Insert) ──
          if (errors.length > 0) {
            linesWithError++;
            results.push({ rowIndex, status: "error", errors, alerts });
            continue;
          }

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
                  segment: segmento || undefined,
                  city: cidade || undefined,
                  source: origem || undefined,
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
                const oppTitle = normalizeText(row.nomeDaOportunidade) || `Venda - ${empresa || nome}`;
                const result = await tx.insert(opportunities).values({
                  contactId: txContactId,
                  pipelineId: resolvedPipelineId,
                  stageId: resolvedStageId,
                  title: oppTitle,
                  monetaryValue: parsedMonetaryValue ?? undefined,
                  source: origem || undefined,
                  notes: observacoes || undefined,
                  segment: segmento || undefined,
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
              if (telefone) contactIdByPhone.set(telefone, txResult.contactId);
              if (email) contactIdByEmail.set(email, txResult.contactId);
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
            const rawMessage = e?.message ? String(e.message).toLowerCase() : "";
            if (rawMessage.includes("out of range") || rawMessage.includes("data truncated")) {
              e.message = "Valor monetario fora do limite suportado.";
            } else if (rawMessage.includes("foreign key")) {
              e.message = "Pipeline ou estagio invalido para esta linha.";
            } else if (rawMessage.includes("duplicate")) {
              e.message = "Conflito de dado duplicado na linha.";
            } else {
              e.message = "Erro ao gravar a linha. Verifique os dados e tente novamente.";
            }
            // Se falhou dentro da transação, TUDO dessa linha foi revertido (inclusive o contato recém-criado)
            errors.push(`Erro na gravação (transação abortada): ${e.message}`);
            linesWithError++;
            results.push({ rowIndex, status: "error", errors, alerts });
          }
        }

        const summary = {
          totalRows: rows.length,
          linesProcessed: results.length,
          linesSkipped,
          linesWithError,
          contactsCreated,
          contactsReused,
          opportunitiesCreated,
          tagsIgnored,
        };

        console.log("[Import] bulkImport finished", {
          rows: input.rows.length,
          contactsCreated: summary.contactsCreated,
          contactsReused: summary.contactsReused,
          opportunitiesCreated: summary.opportunitiesCreated,
          linesWithError: summary.linesWithError,
        });

        return {
          summary,
          results,
        };
        } catch (error) {
          console.error("[Import] bulkImport unexpected error", error);

          if (error instanceof TRPCError) {
            throw error;
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro interno ao processar a importação. Verifique os logs do servidor.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
