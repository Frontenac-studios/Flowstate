import type { Top3SlotInput, Top3Status } from "./types";

const ORDERS = [1, 2, 3] as const;

export function buildTop3Status(slots: Top3SlotInput[]): Top3Status {
  const byOrder = new Map<number, Top3SlotInput>();
  for (const row of slots) {
    if (row.top3Order !== null && row.top3Order >= 1 && row.top3Order <= 3) {
      byOrder.set(row.top3Order, row);
    }
  }

  return {
    slots: ORDERS.map((order) => {
      const task = byOrder.get(order);
      if (!task) {
        return { order, status: "empty" as const };
      }
      const status = task.completedAt != null ? ("done" as const) : ("incomplete" as const);
      return {
        order,
        status,
        taskId: task.id,
        title: task.title,
      };
    }),
  };
}
