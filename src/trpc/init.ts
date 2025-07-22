import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";

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
