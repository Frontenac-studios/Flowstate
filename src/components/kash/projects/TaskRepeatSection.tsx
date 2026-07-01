"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import RepeatPicker from "@/components/kash/projects/RepeatPicker";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

type Props = {
  taskId: string;
  disabled?: boolean;
};

export default function TaskRepeatSection({ taskId, disabled = false }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: rule } = useQuery(trpc.recurrence.getForTask.queryOptions({ taskId }));

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.recurrence.getForTask.queryKey({ taskId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
  };

  const setRuleMutation = useMutation(
    trpc.recurrence.setRule.mutationOptions({
      onSuccess: () => invalidate(),
    })
  );

  const removeRuleMutation = useMutation(
    trpc.recurrence.removeRule.mutationOptions({
      onSuccess: () => invalidate(),
    })
  );

  const startDate = rule?.startDate ?? toISODateString(startOfLocalDay());
  const pending = setRuleMutation.isPending || removeRuleMutation.isPending;

  const onPickerChange = (next: { rrule: string | null; startDate: string }) => {
    if (!next.rrule) {
      if (rule) removeRuleMutation.mutate({ taskId });
      return;
    }
    setRuleMutation.mutate({
      taskId,
      rrule: next.rrule,
      startDate: next.startDate,
    });
  };

  return (
    <RepeatPicker
      rrule={rule?.rrule ?? null}
      startDate={startDate}
      disabled={disabled || pending}
      onChange={onPickerChange}
    />
  );
}
