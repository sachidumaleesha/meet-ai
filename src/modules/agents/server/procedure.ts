import { baseProcedure, createTRPCRouter } from "@/app/trpc/init";
import { prisma } from "@/lib/db";

export const agentsRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    const data = await prisma.agent.findMany();
    return data;
  }),
});
