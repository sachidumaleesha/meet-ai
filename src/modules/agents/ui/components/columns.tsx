"use client";

import { ColumnDef } from "@tanstack/react-table";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Badge } from "@/components/ui/badge";

import { AgentsGetMany } from "../../types";

import { CornerDownRightIcon, VideoIcon } from "lucide-react";

export const columns: ColumnDef<AgentsGetMany[number]>[] = [
  {
    accessorKey: "name",
    header: "Agent Name",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-y-1">
          <div className="flex items-center gap-x-2">
            <GeneratedAvatar
              seed={row.original.name}
              variant="botttsNeutral"
              className="size-6"
            />
            <span className="semibold capitalize">{row.original.name}</span>
          </div>
          <div className="flex items-center gap-x-2">
            <CornerDownRightIcon className="size-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
              {row.original.instructions}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "meetingCount",
    header: "Meetings",
    cell: ({ row }) => {
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-x-2 [&>svg]:size-4"
        >
          <VideoIcon className="text-blue-700" />{" "}
          {/* {row.original.meetingCount}{" "} */}
          {/* {row.original.meetingCount === 1 ? "Meeting" : "Meetings"} */}5
          Meetings
        </Badge>
      );
    },
  },
];
