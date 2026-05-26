"use client";

import type { Bucket } from "@/lib/tasks/derive-bucket";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "./TaskRow";
import { BucketSection } from "./BucketSection";

export type BucketedTasks = {
  tomorrow: PlanTaskRow[];
  thisWeek: PlanTaskRow[];
  later: PlanTaskRow[];
};

type Props = {
  tasks: BucketedTasks;
  pulseBucket: Bucket | null;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function PlanBuckets({ tasks, pulseBucket, onComplete, onDelete }: Props) {
  return (
    <>
      <BucketSection
        bucket="tomorrow"
        label="Tomorrow"
        tasks={tasks.tomorrow}
        pulse={pulseBucket === "tomorrow"}
        onComplete={onComplete}
        onDelete={onDelete}
      />
      <BucketSection
        bucket="this_week"
        label="This Week"
        tasks={tasks.thisWeek}
        pulse={pulseBucket === "this_week"}
        onComplete={onComplete}
        onDelete={onDelete}
      />
      <BucketSection
        bucket="later"
        label="Later"
        tasks={tasks.later}
        pulse={pulseBucket === "later"}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    </>
  );
}
