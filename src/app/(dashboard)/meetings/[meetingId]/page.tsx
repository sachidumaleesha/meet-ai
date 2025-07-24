import { getQueryClient, trpc } from "@/trpc/server";

import {
  MeetingIdView,
  MeetingIdViewError,
  MeetingIdViewLoading,
} from "@/modules/meetings/ui/views/meeting-id-view";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

interface Props {
  params: Promise<{ meetingId: string }>;
}

const MeetingPage = async ({ params }: Props) => {
  const { meetingId } = await params;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.meetings.getOne.queryOptions({
      id: meetingId,
    })
  );
  // TODO: Prefetch `meeting.getTranscript`

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<MeetingIdViewLoading />}>
        <ErrorBoundary fallback={<MeetingIdViewError />}>
          <MeetingIdView meetingId={meetingId} />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};

export default MeetingPage;
