import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

export const meetingsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { auth } = ctx;
      try {
        const data = await prisma.meeting.findFirst({
          where: {
            id: input.id,
            userId: auth.user.id,
          },
        });

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
          });
        }

        return data;
      } catch (error) {
        console.error("Error fetching meeting:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch meeting",
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
        const data = await prisma.meeting.findMany({
          where: {
            userId: auth.user.id,
            ...(search ? { name: { contains: search } } : undefined),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        const total = await prisma.meeting.count({
          where: {
            userId: auth.user.id,
            ...(search ? { name: { contains: search } } : undefined),
          },
        });

        const totalPages = Math.ceil(total / pageSize);

        return { items: data, total, totalPages };
      } catch (error) {
        console.error("Error fetching meetings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch meetings",
          cause: error,
        });
      }
    }),
});
