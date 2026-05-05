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
import { tags, contacts } from "../drizzle/schema";
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
});

export type AppRouter = typeof appRouter;
