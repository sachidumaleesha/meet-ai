import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STREAM_VIDEO_API_KEY: z.string().min(1),
    NEXT_PUBLIC_STREAM_CHAT_API_KEY: z.string().min(1),
  },
  server: {
    DATABASE_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    STREAM_VIDEO_SECRET_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    STREAM_CHAT_SECRET_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STREAM_VIDEO_API_KEY:
      process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY,
    NEXT_PUBLIC_STREAM_CHAT_API_KEY:
      process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY,
  },
});
