"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { NewAgentDialog } from "./new-agent-dialog";

import { AgentsSearchFilter } from "./agents-search-filter";
import { useAgentsFilters } from "../../hooks/use-agents-filters";

import { DEFAULT_PAGE } from "@/constants";

import { CirclePlusIcon, XCircleIcon } from "lucide-react";

export const AgentListHeader = () => {
  const [filters, setFilters] = useAgentsFilters();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAnyFilterModified = !!filters.search;

  const onClearFilters = () => {
    setFilters({
      search: "",
      page: DEFAULT_PAGE,
    });
  };

  return (
    <>
      <NewAgentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-5 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Agents</h5>
          <Button onClick={() => setIsDialogOpen(true)}>
            <CirclePlusIcon />
            New Agent
          </Button>
        </div>
        <ScrollArea>
          <div className="flex items-center gap-x-2">
            <AgentsSearchFilter />
            {isAnyFilterModified && (
              <Button variant="outline" onClick={onClearFilters}>
                <XCircleIcon />
                Clear
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
