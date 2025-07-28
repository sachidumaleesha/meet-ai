import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import {
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallSessionParticipantLeftEvent,
  CallRecordingReadyEvent,
  CallSessionStartedEvent,
} from "@stream-io/video-react-sdk";
import { streamVideo } from "@/lib/stream-video";
import { env } from "@/types/env";

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  console.log('Webhook received at:', new Date().toISOString());
  
  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");
  
  console.log('Headers received - signature:', !!signature, 'apiKey:', !!apiKey);

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
  console.log('Processing event type:', eventType);

  if (eventType === "call.session.started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId;
    console.log('Event payload:', JSON.stringify(event, null, 2));
    console.log('Extracted meetingId:', meetingId);

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
    console.log('Current time:', new Date().toISOString());

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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        meetingId,
        time: new Date().toISOString()
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
  }

  return NextResponse.json({ status: "ok" });
}
