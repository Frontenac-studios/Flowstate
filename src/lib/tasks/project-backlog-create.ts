export type ProjectBacklogCreateFields = {
  scheduledDate: null;
  bucketOverride: "later";
  suggestedScheduledDate: string | null;
};

/** Maps project setup / seed input to the project backlog landing contract. */
export function resolveProjectBacklogCreateFields(options?: {
  phaseStartDate?: string | null;
}): ProjectBacklogCreateFields {
  const phaseStartDate = options?.phaseStartDate?.trim() || null;
  return {
    scheduledDate: null,
    bucketOverride: "later",
    suggestedScheduledDate: phaseStartDate,
  };
}
