import { z } from "zod";

export const meetingsInsertSchema = z.object({
  name: z.string().min(1, { message: "Meeting name is required" }),
  agentId: z.string().min(1, { message: "Agent id is required" }),
});

export const meetingsUpdateSchema = meetingsInsertSchema.extend({
  id: z.string().min(1, { message: "Meeting id is required" }),
});
