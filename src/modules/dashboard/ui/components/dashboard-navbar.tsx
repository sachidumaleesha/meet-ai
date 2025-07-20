"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
} from "lucide-react";

import { DashboardCommand } from "./dashboard-command";

export const DashboardNavbar = () => {
  const { state, toggleSidebar, isMobile } = useSidebar();

  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
    };
  }, []);

  return (
    <>
      <DashboardCommand open={commandOpen} setOpen={setCommandOpen} />
      <div className="flex px-4 gap-x-2 items-center py-3 border-b bg-background">
        <Button variant="outline" className="size-9" onClick={toggleSidebar}>
          {state === "collapsed" || isMobile ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
        <Button
          className="h-9 w-[240px] justify-start font-normal text-muted-foreground hover:text-muted-foreground"
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen((open) => !open)}
        >
          <SearchIcon />
          Search
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span>&#8984;</span>K
          </kbd>
        </Button>
      </div>
    </>
  );
};
