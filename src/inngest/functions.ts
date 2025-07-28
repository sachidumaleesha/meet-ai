import { inngest } from "@/inngest/client";
import JSONL from "jsonl-parse-stringify";

import { StreamTranscriptItem } from "@/modules/meetings/types";
import { prisma } from "@/lib/db";

import { createAgent, openai, TextMessage } from "@inngest/agent-kit";
import { systemPrompt } from "./system-prompt";
import { env } from "@/types/env";

const summarizer = createAgent({
  name: "summarizer",
  system: systemPrompt,
  model: openai({ model: "gpt-4o", apiKey: env.OPENAI_API_KEY }),
});

export const meetingPrecessing = inngest.createFunction(
  { id: "meeting/precessing" },
  { event: "meeting/precessing" },
  async ({ event, step }) => {
    const response = await step.run("fetch-transcript", async () => {
      const response = await fetch(event.data.transcriptUrl).then((res) =>
        res.text()
      );
      return response;
    });

    const transcript = await step.run("parse-transcript", async () => {
      const lines = JSONL.parse<StreamTranscriptItem>(response);
      return lines;
    });

    const transcriptionWithSpeakers = await step.run(
      "add-speakers",
      async () => {
        const speakerIds = [
          ...new Set(transcript.map((item) => item.speaker_id)),
        ];

        const userSpeakers = await prisma.user.findMany({
          where: {
            id: {
              in: speakerIds,
            },
          },
        });

        const speakerMap = new Map(userSpeakers.map((user) => [user.id, user]));

        const agentSpeakers = await prisma.agent.findMany({
          where: {
            id: {
              in: speakerIds,
            },
          },
        });

        const agentMap = new Map(
          agentSpeakers.map((agent) => [agent.id, agent])
        );

        const speakers = [...speakerMap.values(), ...agentMap.values()];

        return transcript.map((item) => {
          const speaker = speakers.find(
            (speaker) => speaker.id === item.speaker_id
          );

          if (!speaker) {
            return {
              ...item,
              user: {
                name: "Unknown",
              },
            };
          }

          return {
            ...item,
            user: {
              name: speaker.name,
            },
          };
        });
      }
    );

    const { output } = await summarizer.run(
      "Summarize the following transcript" +
        JSON.stringify(transcriptionWithSpeakers)
    );

    await step.run("save-summary", async () => {
      const summary = await prisma.meeting.update({
        where: {
          id: event.data.meetingId,
        },
        data: {
          summary: (output[0] as TextMessage).content as string,
          status: "completed",
        },
      });
      return summary;
    });
  }
);
