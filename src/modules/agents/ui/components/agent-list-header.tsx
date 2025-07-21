"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CirclePlusIcon } from "lucide-react";
import { NewAgentDialog } from "./new-agent-dialog";

export const AgentListHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      </div>
    </>
  );
};
