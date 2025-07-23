import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { SearchParams } from "nuqs";
import { loadSearchParams } from "@/modules/agents/params";

import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import {
  AgentsView,
  AgentsViewError,
  AgentsViewLoading,
} from "@/modules/agents/ui/views/agents-view";

import { AgentListHeader } from "@/modules/agents/ui/components/agent-list-header";

interface Props {
  searchParams: Promise<SearchParams>;
}

const Page = async ({ searchParams }: Props) => {
  const filters = await loadSearchParams(searchParams);
  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery(
      trpc.agents.getMany.queryOptions({
        ...filters,
      })
    );
  } catch (error) {
    console.error("Error prefetching agents:", error);
  }

  return (
    <>
      <AgentListHeader />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<AgentsViewLoading />}>
          <ErrorBoundary fallback={<AgentsViewError />}>
            <AgentsView />
          </ErrorBoundary>
        </Suspense>
      </HydrationBoundary>
    </>
  );
};

export default Page;
