import { describe, expect, it, vi } from "vitest";

import {
  CHAT_TASKS_CREATED_EVENT,
  type ChatCreatedTask,
  dispatchChatTasksCreated,
  onChatTasksCreated,
} from "./chat-task-created-events";

const task = (overrides: Partial<ChatCreatedTask> = {}): ChatCreatedTask => ({
  id: "t1",
  title: "Pay water bill",
  projectId: null,
  phaseId: null,
  category: "adulting",
  suggestedScheduledDate: "2026-07-09",
  ...overrides,
});

describe("chat-task-created-events", () => {
  it("delivers the created-task detail to a subscriber", () => {
    const handler = vi.fn();
    const off = onChatTasksCreated(handler);

    dispatchChatTasksCreated({ tasks: [task()], surface: "week" });

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0]![0];
    expect(detail.surface).toBe("week");
    expect(detail.tasks).toHaveLength(1);
    expect(detail.tasks[0]).toMatchObject({
      id: "t1",
      category: "adulting",
      suggestedScheduledDate: "2026-07-09",
    });

    off();
  });

  it("carries project/phase placement for a Miller-column create (row 2)", () => {
    const handler = vi.fn();
    const off = onChatTasksCreated(handler);

    dispatchChatTasksCreated({
      tasks: [
        task({ id: "t2", projectId: "proj-1", phaseId: "phase-1", category: "personal_projects" }),
      ],
      surface: "projects",
    });

    expect(handler.mock.calls[0]![0].tasks[0]).toMatchObject({
      projectId: "proj-1",
      phaseId: "phase-1",
    });
    off();
  });

  it("stops delivering after unsubscribe", () => {
    const handler = vi.fn();
    const off = onChatTasksCreated(handler);
    off();

    dispatchChatTasksCreated({ tasks: [task()], surface: "week" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("dispatches a CustomEvent under the shared event name", () => {
    const listener = vi.fn();
    window.addEventListener(CHAT_TASKS_CREATED_EVENT, listener);

    dispatchChatTasksCreated({ tasks: [task()], surface: null });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0]).toBeInstanceOf(CustomEvent);
    window.removeEventListener(CHAT_TASKS_CREATED_EVENT, listener);
  });
});
