import { z } from "zod";
import JSONL from "jsonl-parse-stringify";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

import { streamVideo } from "@/lib/stream-video";

import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { MeetingStatus, StreamTranscriptItem } from "../types";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";

export const meetingsRouter = createTRPCRouter({
  generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = streamChat.createToken(ctx.auth.user.id);
    await streamChat.upsertUsers([
      {
        id: ctx.auth.user.id,
        role: "admin",
      },
    ]);

    return token;
  }),
  getTranscript: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      if (!existingMeeting.transcriptUrl) {
        return [];
      }

      const transcript = await fetch(existingMeeting.transcriptUrl)
        .then((res) => res.text())
        .then((text) => JSONL.parse<StreamTranscriptItem>(text))
        .catch(() => {
          return [];
        });

      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ];

      const users = await prisma.user.findMany({
        where: {
          id: {
            in: speakerIds,
          },
        },
      });

      const userSpeakers = users.map((user) => ({
        ...user,
        image:
          user.image ??
          generateAvatarUri({ seed: user.name, variant: "initials" }),
      }));

      const agents = await prisma.agent.findMany({
        where: {
          id: {
            in: speakerIds,
          },
        },
      });

      const agentSpeakers = agents.map((agent) => ({
        ...agent,
        image: generateAvatarUri({
          seed: agent.name,
          variant: "botttsNeutral",
        }),
      }));

      const speakers = [...userSpeakers, ...agentSpeakers];

      const transcriptWithSpeakers = transcript.map((item) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === item.speaker_id
        );

        if (!speaker) {
          return {
            ...item,
            user: {
              name: "Unknown",
              image: generateAvatarUri({
                seed: "Unknown",
                variant: "initials",
              }),
            },
          };
        }

        return {
          ...item,
          user: {
            name: speaker.name,
            image: speaker.image,
          },
        };
      });

      return transcriptWithSpeakers;
    }),
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: "admin",
        image:
          ctx.auth.user.image ??
          generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" }),
      },
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60;

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt,
    });

    return token;
  }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { auth } = ctx;
      try {
        let data = await prisma.meeting.findFirst({
          where: {
            id: input.id,
            userId: auth.user.id,
          },
          include: {
            agent: true,
          },
        });

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
          });
        }

        // Calculate duration for each meeting
        let duration = null;
        if (data.endedAt && data.startedAt) {
          // Calculate duration in seconds
          duration = Math.floor(
            (data.endedAt.getTime() - data.startedAt.getTime()) / 1000
          );
        }

        return {
          ...data,
          duration,
        };
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
            MeetingStatus.Upcoming,
            MeetingStatus.Active,
            MeetingStatus.Completed,
            MeetingStatus.Cancelled,
            MeetingStatus.Processing,
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
  create: premiumProcedure("meetings")
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
        const call = streamVideo.video.call("default", data.id);
        await call.create({
          data: {
            created_by_id: auth.user.id,
            custom: {
              meetingId: data.id,
              meetingName: data.name,
            },
            settings_override: {
              transcription: {
                language: "en",
                mode: "auto-on",
                closed_caption_mode: "auto-on",
              },
              recording: {
                mode: "auto-on",
                quality: "1080p",
              },
            },
          },
        });

        const existingAgent = await prisma.agent.findFirst({
          where: {
            id: data.agentId,
          },
        });

        if (!existingAgent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        await streamVideo.upsertUsers([
          {
            id: existingAgent.id,
            name: existingAgent.name,
            role: "user",
            image: generateAvatarUri({
              seed: existingAgent.name,
              variant: "botttsNeutral",
            }),
          },
        ]);

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
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { auth } = ctx;
      try {
        const data = await prisma.meeting.delete({
          where: {
            id,
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
        console.error("Error removing meeting:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove meeting",
          cause: error,
        });
      }
    }),
});
