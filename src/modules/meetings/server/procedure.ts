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
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { MeetingStatus } from "../types";

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
        agentId: z.string().nullish(),
        status: z
          .enum([
            MeetingStatus.UPCOMING,
            MeetingStatus.ACTIVE,
            MeetingStatus.COMPLETED,
            MeetingStatus.CANCELLED,
            MeetingStatus.PROCESSING,
          ])
          .nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        /* 
          what some thing like this
          select agent
          duration: sql`EXTRACT<number>(EPOCH FROM (endedAt - startedAt)).as("duration")`,

          innerJoin(agents, agents.id = meetings.agentId)

          how to implement that
        */

        const { auth } = ctx;
        const { page, pageSize, search, agentId, status } = input;
        const data = await prisma.meeting.findMany({
          where: {
            userId: auth.user.id,
            ...(search
              ? { name: { contains: search, mode: "insensitive" } }
              : undefined),
            ...(agentId ? { agentId } : undefined),
            ...(status ? { status } : undefined),
          },
          include: {
            agent: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        // Calculate duration for each meeting
        const meetingsWithDuration = data.map((meeting) => {
          let duration = null;
          if (meeting.endedAt && meeting.startedAt) {
            // Calculate duration in seconds
            duration = Math.floor(
              (meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000
            );
          }

          return {
            ...meeting,
            duration,
          };
        });

        // Get total count for pagination
        const total = await prisma.meeting.count({
          where: {
            userId: auth.user.id,
            // agent: {
            //   isNot: undefined,
            // },
            ...(search
              ? { name: { contains: search, mode: "insensitive" } }
              : undefined),
            ...(agentId ? { agentId } : undefined),
            ...(status ? { status } : undefined),
          },
        });

        const totalPages = Math.ceil(total / pageSize);

        return { items: meetingsWithDuration, total, totalPages };
      } catch (error) {
        console.error("Error fetching meetings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch meetings",
          cause: error,
        });
      }
    }),
  create: protectedProcedure
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, agentId } = input;
      const { auth } = ctx;
      try {
        const data = await prisma.meeting.create({
          data: {
            name,
            agentId,
            userId: auth.user.id,
          },
        });
        // TODO: update stream call, upsert stream users
        return data;
      } catch (error) {
        console.error("Error creating meeting:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create meeting",
          cause: error,
        });
      }
    }),
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, name, agentId } = input;
      const { auth } = ctx;
      try {
        const data = await prisma.meeting.update({
          where: {
            id,
            userId: auth.user.id,
          },
          data: {
            name,
            agentId,
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
        console.error("Error updating meeting:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update meeting",
          cause: error,
        });
      }
    }),
});
