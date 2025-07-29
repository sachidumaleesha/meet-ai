import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { polarClient } from "@/lib/polar";
import { prisma } from "@/lib/db";
import {
  MAX_FREE_AGENTS,
  MAX_FREE_MEETINGS,
} from "@/modules/premium/constants";

export const createTRPCContext = cache(async () => {
  // return { userId: "user_123" };
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return { auth: session };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth?.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized bro" });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const userMeetingsCount = await prisma.meeting.count({
      where: {
        userId: ctx.auth.user.id,
      },
    });

    const userAgentsCount = await prisma.agent.count({
      where: {
        userId: ctx.auth.user.id,
      },
    });

    const isPremium = customer.activeSubscriptions.length > 0;
    const isFreeAgentLimitReached = userAgentsCount >= MAX_FREE_AGENTS;
    const isFreeMeetingLimitReached = userMeetingsCount >= MAX_FREE_MEETINGS;

    const shouldThrowMeetingError =
      entity === "meetings" && isFreeMeetingLimitReached && !isPremium;
    const shouldThrowAgentError =
      entity === "agents" && isFreeAgentLimitReached && !isPremium;

    if (shouldThrowMeetingError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free meetings",
      });
    }

    if (shouldThrowAgentError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free agents",
      });
    }

    return next({ ctx: { ...ctx, customer } });
  });
