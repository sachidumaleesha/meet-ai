import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";
import { prisma } from "@/lib/db";

import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallSessionParticipantLeftEvent,
  CallRecordingReadyEvent,
  CallSessionStartedEvent,
  UserUpdatedEvent,
} from "@stream-io/video-react-sdk";
import { streamVideo } from "@/lib/stream-video";
import { env } from "@/types/env";
import { inngest } from "@/inngest/client";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";
import { MessageNewEvent } from "@stream-io/node-sdk";

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  console.log("Webhook received at:", new Date().toISOString());

  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  console.log(
    "Headers received - signature:",
    !!signature,
    "apiKey:",
    !!apiKey
  );

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 401 }
    );
  }

  const body = await req.text();

  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid payload json" },
      { status: 400 }
    );
  }

  const eventType = (payload as Record<string, unknown>)?.type;
  console.log("Processing event type:", eventType);

  if (eventType === "call.session.started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId;
    console.log("Event payload:", JSON.stringify(event, null, 2));
    console.log("Extracted meetingId:", meetingId);

    if (!meetingId) {
      return NextResponse.json(
        { error: "Meeting ID not found" },
        { status: 400 }
      );
    }

    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        status: {
          notIn: ["completed", "active", "cancelled", "processing"],
        },
      },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    console.log("Attempting to update meeting with ID:", meetingId);
    console.log("Current time:", new Date().toISOString());

    try {
      const updatedMeeting = await prisma.meeting.update({
        where: {
          id: meetingId,
        },
        data: {
          status: "active",
        },
      });
      console.log("Meeting status updated:", updatedMeeting);
    } catch (error) {
      console.error("Error updating meeting status:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        meetingId,
        time: new Date().toISOString(),
      });
    }

    const existingAgent = await prisma.agent.findFirst({
      where: {
        id: existingMeeting.agentId,
      },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const call = streamVideo.video.call("default", meetingId);
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: env.OPENAI_API_KEY,
      agentUserId: existingAgent.userId,
    });

    realtimeClient.updateSession({
      instructions: existingAgent.instructions,
    });
  } else if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1];

    if (!meetingId) {
      return NextResponse.json(
        { error: "Meeting ID not found" },
        { status: 400 }
      );
    }

    const call = streamVideo.video.call("default", meetingId);
    await call.end();
  } else if (eventType === "user.updated") {
    const event = payload as UserUpdatedEvent;
    console.log("User updated event handled:", event);
  } else if (eventType === "call.ended") {
    const event = payload as CallEndedEvent;
    const meetingId = event.call.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    try {
      await prisma.meeting.update({
        where: {
          id: meetingId,
        },
        data: {
          status: "completed",
          endedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating meeting status to completed:", error);
      return NextResponse.json(
        { error: "Failed to update meeting status" },
        { status: 500 }
      );
    }
  } else if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    const updatedMeeting = await prisma.meeting.update({
      where: {
        id: meetingId,
      },
      data: {
        transcriptUrl: event.call_transcription.url,
      },
    });

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await inngest.send({
      name: "meeting/precessing",
      data: {
        meetingId,
        transcriptUrl: updatedMeeting.transcriptUrl,
      },
    });
  } else if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    const updatedMeeting = await prisma.meeting.update({
      where: {
        id: meetingId,
      },
      data: {
        recordingUrl: event.call_recording.url,
      },
    });

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // TODO: call inngest background
  } else if (eventType === "message.new") {
    const event = payload as MessageNewEvent;

    const userId = event.user?.id;
    const channelId = event.channel_id;
    const text = event.message?.text;

    if (!userId || !channelId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        id: channelId,
        status: "completed",
      },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const existingAgent = await prisma.agent.findFirst({
      where: {
        id: existingMeeting.agentId,
      },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (userId !== existingAgent.id) {
      const instructions = `
            You are an AI assistant helping the user revisit a recently completed meeting.
            Below is a summary of the meeting, generated from the transcript:
            
            ${existingMeeting.summary}
            
            The following are your original instructions from the live meeting assistant. Please continue to follow these behavioral guidelines as you assist the user:
            
            ${existingAgent.instructions}
            
            The user may ask questions about the meeting, request clarifications, or ask for follow-up actions.
            Always base your responses on the meeting summary above.
            
            You also have access to the recent conversation history between you and the user. Use the context of previous messages to provide relevant, coherent, and helpful responses. If the user's question refers to something discussed earlier, make sure to take that into account and maintain continuity in the conversation.
            
            If the summary does not contain enough information to answer a question, politely let the user know.
            
            Be concise, helpful, and focus on providing accurate information from the meeting and the ongoing conversation.
            `;

      const channel = streamChat.channel(channelId);
      await channel.watch();

      const previousMessages = channel.state.messages
        .slice(-5)
        .filter((message) => message.text && message.text.trim() !== "")
        .map<ChatCompletionMessageParam>((message) => ({
          role: message.user?.id === existingAgent.id ? "assistant" : "user",
          content: message.text || "",
        }));

      const GPTResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: instructions },
          ...previousMessages,
          { role: "user", content: text },
        ],
      });

      const GPTResponseText = GPTResponse.choices[0].message.content;

      if (!GPTResponseText) {
        return NextResponse.json(
          { error: "GPT response is empty" },
          { status: 500 }
        );
      }

      const avatarUrl = generateAvatarUri({
        seed: existingAgent.name,
        variant: "botttsNeutral",
      });

      streamChat.upsertUser({
        id: existingAgent.id,
        name: existingAgent.name,
        image: avatarUrl,
      });

      channel.sendMessage({
        text: GPTResponseText,
        user: {
          id: existingAgent.id,
          name: existingAgent.name,
          image: avatarUrl,
        },
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
