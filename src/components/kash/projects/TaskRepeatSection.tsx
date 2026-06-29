"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Select from "@/components/kash/ui/Select";
import { formatRruleLabel } from "@/lib/recurrence/format-label";
import { toISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

const REPEAT_PRESETS: ReadonlyArray<{ rrule: string | null; label: string }> = [
  { rrule: null, label: "Does not repeat" },
  { rrule: "FREQ=DAILY", label: "Daily" },
  { rrule: "FREQ=WEEKLY", label: "Weekly" },
  { rrule: "FREQ=WEEKLY;BYDAY=TU", label: "Every Tue" },
  { rrule: "FREQ=MONTHLY;BYMONTHDAY=1", label: "Monthly on the 1st" },
];

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

  const currentValue = rule?.rrule ?? "";
  const pending = setRuleMutation.isPending || removeRuleMutation.isPending;

  const onChange = (next: string) => {
    if (!next) {
      if (rule) removeRuleMutation.mutate({ taskId });
      return;
    }
    setRuleMutation.mutate({
      taskId,
      rrule: next,
      startDate: rule?.startDate ?? toISODateString(startOfLocalDay()),
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`task-repeat-${taskId}`} className="text-sm font-medium text-ink">
        Repeat
      </label>
      <Select
        id={`task-repeat-${taskId}`}
        className="w-full text-sm"
        value={currentValue}
        disabled={disabled || pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {REPEAT_PRESETS.map((preset) => (
          <option key={preset.label} value={preset.rrule ?? ""}>
            {preset.label}
          </option>
        ))}
        {rule && !REPEAT_PRESETS.some((p) => p.rrule === rule.rrule) ? (
          <option value={rule.rrule}>{formatRruleLabel(rule.rrule)}</option>
        ) : null}
      </Select>
    </div>
  );
}
