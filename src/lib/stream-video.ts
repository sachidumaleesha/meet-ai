import "server-only";

import { env } from "@/types/env";
import { StreamClient } from "@stream-io/node-sdk";

const apiKey = env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secret = env.STREAM_VIDEO_SECRET_KEY;

export const streamVideo = new StreamClient(apiKey, secret);
