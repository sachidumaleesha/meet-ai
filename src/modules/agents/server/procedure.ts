import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { prisma } from "@/lib/db";
import { agentsInsertSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

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
  getMany: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { auth } = ctx;
      const data = await prisma.agent.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: "desc" },
      });

      return data;
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
});
