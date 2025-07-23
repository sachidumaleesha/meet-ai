import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingsInsertSchema } from "../../schemas";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/generated-avatar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { MeetingGetOne } from "../../types";
import { NewAgentDialog } from "@/modules/agents/ui/components/new-agent-dialog";

import { Loader } from "lucide-react";

interface MeetingFormProps {
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
  initialValues?: MeetingGetOne;
}

export const MeetingForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: MeetingFormProps) => {
  const trpc = useTRPC();
  const queryClinet = useQueryClient();

  const [openNewAgentDialog, setOpenNewAgentDialog] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  const agents = useQuery(
    trpc.agents.getMany.queryOptions({
      pageSize: 100,
      search: agentSearch,
    })
  );

  const createMeeting = useMutation(
    trpc.meetings.create.mutationOptions({
      onSuccess: async (data) => {
        await queryClinet.invalidateQueries(
          trpc.meetings.getMany.queryOptions({})
        );
        // TODO: Invalidate free tier usage
        onSuccess?.(data.id);
      },
      onError: (error) => {
        toast.error(error.message);
        // TODO: check if error code is "Forbidden", redirect to "/upgrade"
      },
    })
  );

  const updateMeeting = useMutation(
    trpc.meetings.update.mutationOptions({
      onSuccess: async () => {
        await queryClinet.invalidateQueries(
          trpc.meetings.getMany.queryOptions({})
        );

        if (initialValues?.id) {
          await queryClinet.invalidateQueries(
            trpc.meetings.getOne.queryOptions({ id: initialValues.id })
          );
        }

        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
        // TODO: check if error code is "Forbidden", redirect to "/upgrade"
      },
    })
  );

  const form = useForm<z.infer<typeof meetingsInsertSchema>>({
    resolver: zodResolver(meetingsInsertSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      agentId: initialValues?.agentId ?? "",
    },
  });

  const isEdit = !!initialValues?.id;
  const isPending = createMeeting.isPending || updateMeeting.isPending;

  const onSubmit = (values: z.infer<typeof meetingsInsertSchema>) => {
    if (isEdit) {
      updateMeeting.mutate({ ...values, id: initialValues.id });
    } else {
      createMeeting.mutate(values);
    }
  };

  return (
    <>
      <NewAgentDialog
        open={openNewAgentDialog}
        onOpenChange={setOpenNewAgentDialog}
      />
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g Math Consultation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent</FormLabel>
                <FormControl>
                  <CommandSelect
                    options={
                      (agents.data?.items ?? []).map((agent) => ({
                        id: agent.id,
                        value: agent.id,
                        children: (
                          <div className="flex items-center gap-x-2">
                            <GeneratedAvatar
                              seed={agent.name}
                              variant="botttsNeutral"
                              className="border size-6"
                            />
                            <span>{agent.name}</span>
                          </div>
                        ),
                      })) ?? []
                    }
                    onSelect={field.onChange}
                    onSearch={setAgentSearch}
                    value={field.value}
                    placeholder="Select an agent"
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Not found what you&apos;re looking for?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setOpenNewAgentDialog(true)}
                  >
                    Create new agent
                  </button>
                </FormDescription>
              </FormItem>
            )}
          />
          <div className="flex justify-between gap-x-2">
            {onCancel && (
              <Button
                variant="outline"
                disabled={isPending}
                type="button"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isEdit ? (
                isPending ? (
                  <span className="flex items-center">
                    <Loader className="mr-2 h-4 w-4 animate-spin" /> Updating
                  </span>
                ) : (
                  "Update"
                )
              ) : isPending ? (
                <span className="flex items-center">
                  <Loader className="mr-2 h-4 w-4 animate-spin" /> Creating
                </span>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
