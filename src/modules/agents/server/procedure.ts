import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { agentsInsertSchema, agentsUpdateSchema } from "../schemas";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

export const agentsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { auth } = ctx;
      try {
        const data = await prisma.agent.findFirst({
          where: {
            id: input.id,
            userId: auth.user.id,
          },
        });

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return data;
      } catch (error) {
        console.error("Error fetching agent:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch agent",
          cause: error,
        });
      }
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { auth } = ctx;
        const { page, pageSize, search } = input;
        const data = await prisma.agent.findMany({
          where: {
            userId: auth.user.id,
            ...(search
              ? { name: { contains: search, mode: "insensitive" } }
              : undefined),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        const total = await prisma.agent.count({
          where: {
            userId: auth.user.id,
            ...(search
              ? { name: { contains: search, mode: "insensitive" } }
              : undefined),
          },
        });

        const totalPages = Math.ceil(total / pageSize);

        return { items: data, total, totalPages };
      } catch (error) {
        console.error("Error fetching agents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch agents",
          cause: error,
        });
      }
    }),
  create: protectedProcedure
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, instructions } = input;
      const { auth } = ctx;
      try {
        const data = await prisma.agent.create({
          data: {
            name,
            instructions,
            userId: auth.user.id,
          },
        });
        return data;
      } catch (error) {
        console.error("Error creating agent:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create agent",
          cause: error,
        });
      }
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { auth } = ctx;
      try {
        const data = await prisma.agent.delete({
          where: {
            id,
            userId: auth.user.id,
          },
        });

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return data;
      } catch (error) {
        console.error("Error removing agent:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove agent",
          cause: error,
        });
      }
    }),
});
