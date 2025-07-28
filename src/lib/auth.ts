import { betterAuth } from "better-auth";

import { PrismaClient } from "@/generated/prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { nextCookies } from "better-auth/next-js";

import { env } from "@/types/env";

const prisma = new PrismaClient();
export const auth = betterAuth({
  trustedOrigins: [
    env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "https://refined-dodo-golden.ngrok-free.app",
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [nextCookies()],
});
