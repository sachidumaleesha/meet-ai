import { polarClient } from "@/lib/polar";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { prisma } from "@/lib/db";

export const premiumRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const subscription = customer.activeSubscriptions[0];

    if (!subscription) {
      return {
        subscription: null,
      };
    }

    const product = await polarClient.products.get({
      id: subscription.productId,
    });

    return {
      subscription,
      product,
    };
  }),
  getProducts: protectedProcedure.query(async () => {
    const products = await polarClient.products.list({
      isArchived: false,
      isRecurring: true,
      sorting: ["price_amount"],
    });

    return products.result.items;
  }),
  getFreeUsage: protectedProcedure.query(async ({ ctx }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const subscription = customer.activeSubscriptions[0];

    if (subscription) {
      return null;
    }

    const userMeetings = await prisma.meeting.count({
      where: {
        userId: ctx.auth.user.id,
      },
    });

    const userAgents = await prisma.agent.count({
      where: {
        userId: ctx.auth.user.id,
      },
    });

    return {
      meetingCount: userMeetings,
      agentCount: userAgents,
    };
  }),
});
