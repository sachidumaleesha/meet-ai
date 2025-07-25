"use client";

import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";

import { columns } from "../components/columns";
import { DataTable } from "@/components/data-table";
import { DataPagination } from "@/components/data-pagination";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";

import { useAgentsFilters } from "../../hooks/use-agents-filters";

export const AgentsView = () => {
  const [filters, setFilters] = useAgentsFilters();
  const router = useRouter();

  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.agents.getMany.queryOptions({
      ...filters,
    })
  );

  return (
    <div className="flex-1 pb-4 px-5 flex flex-col gap-y-4">
      <DataTable
        columns={columns}
        data={data.items}
        onRowClick={(row) => router.push(`/agents/${row.id}`)}
      />
      <DataPagination
        page={filters.page}
        totalPages={data.totalPages}
        onPageChange={(page) => setFilters({ page })}
      />
      {data.items.length === 0 && (
        <EmptyState
          title="Create your first agent"
          description="Create an agent to join your meetings. Each agent will follow your instructions and can interact with participants during the call."
        />
      )}
    </div>
  );
};

export const AgentsViewLoading = () => {
  return (
    <LoadingState
      title="Loading agents"
      description="This may take a few seconds"
    />
  );
};

export const AgentsViewError = () => {
  return (
    <ErrorState
      title="Error loading agents"
      description="Please try again later"
    />
  );
};
