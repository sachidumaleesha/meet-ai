"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import { NewMeetingDialog } from "./new-meeting-dialog";

import { CirclePlusIcon, XCircleIcon } from "lucide-react";

export const MeetingListHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <NewMeetingDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-5 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Meetings</h5>
          <Button onClick={() => setIsDialogOpen(true)}>
            <CirclePlusIcon />
            New Meeting
          </Button>
        </div>
        <div className="flex items-center gap-x-2">
          {/* TODO: add search filter */}
        </div>
      </div>
    </>
  );
};
