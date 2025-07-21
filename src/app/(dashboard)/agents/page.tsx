import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { getQueryClient, trpc } from "@/app/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import {
  AgentsView,
  AgentsViewError,
  AgentsViewLoading,
} from "@/modules/agents/ui/views/agents-view";

const Page = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.agents.getMany.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<AgentsViewLoading />}>
        <ErrorBoundary fallback={<AgentsViewError />}>
          <AgentsView />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
