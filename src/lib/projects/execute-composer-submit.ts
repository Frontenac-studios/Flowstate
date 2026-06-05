import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";
import type { ParentDirPathSegment } from "@/lib/parser/parse-parent-dir-path";
import {
  findPhaseAmongSiblings,
  normalizePhaseName,
  type PhaseRef,
} from "@/lib/projects/find-phase-by-name";
import { mergeComposerPathCreateMasks } from "@/lib/projects/resolve-composer-line-phase-id";

export type ResolvedProjectTaskInput = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  priority: 0 | 1 | 2 | 3;
  phaseId: string | null;
};

export type ComposerTaskPayload = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  priority: 0 | 1 | 2 | 3;
  phaseId: string | null;
};

type PhaseRow = { id: string; name: string };

export type ComposerSubmitMutations = {
  createPhase: (input: {
    projectId: string;
    parentPhaseId: string | null;
    name: string;
  }) => Promise<PhaseRow>;
  createTask: (input: {
    title: string;
    projectId: string;
    phaseId: string | null;
    priority: 0 | 1 | 2 | 3;
    scheduledDate: string | null;
    bucketOverride: "later" | null;
  }) => Promise<unknown>;
  bulkCreateTasks: (input: { projectId: string; tasks: ComposerTaskPayload[] }) => Promise<unknown>;
};

export type ExecuteComposerSubmitParams = {
  projectId: string;
  parentPhaseId: string | null;
  phases: PhaseRef[];
  lines: ParsedProjectLine[];
  defaultPhaseId: string | null;
  mutations: ComposerSubmitMutations;
};

function stepCacheKey(parentPhaseId: string | null, name: string): string {
  return `${parentPhaseId ?? "root"}:${normalizePhaseName(name)}`;
}

async function ensurePhaseAtParent(
  name: string,
  parentPhaseId: string | null,
  stepCache: Map<string, string>,
  phases: PhaseRef[],
  projectId: string,
  createPhase: ComposerSubmitMutations["createPhase"],
  mustCreate: boolean
): Promise<string> {
  const key = stepCacheKey(parentPhaseId, name);
  const cached = stepCache.get(key);
  if (cached) return cached;

  const existing = findPhaseAmongSiblings(phases, name, parentPhaseId);
  if (existing.kind === "found") {
    stepCache.set(key, existing.phaseId);
    return existing.phaseId;
  }

  if (!mustCreate) {
    throw new Error(
      `Composer submit: phase "${name}" not found under parent ${parentPhaseId ?? "root"}`
    );
  }

  const created = await createPhase({
    projectId,
    parentPhaseId,
    name: name.trim(),
  });
  stepCache.set(key, created.id);
  return created.id;
}

async function resolvePathToLeafPhaseId(
  segments: ParentDirPathSegment[],
  createMask: boolean[],
  anchorParentId: string | null,
  stepCache: Map<string, string>,
  phases: PhaseRef[],
  projectId: string,
  createPhase: ComposerSubmitMutations["createPhase"]
): Promise<string | null> {
  if (segments.length === 0) return anchorParentId;

  let parentId = anchorParentId;

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const mustCreate = createMask[i] ?? false;
    parentId = await ensurePhaseAtParent(
      seg.name,
      parentId,
      stepCache,
      phases,
      projectId,
      createPhase,
      mustCreate
    );
  }

  return parentId;
}

/**
 * Creates phases along each path (per-segment +), then creates all tasks at leaf phases.
 */
export async function executeComposerSubmit({
  projectId,
  parentPhaseId,
  phases,
  lines,
  defaultPhaseId,
  mutations,
}: ExecuteComposerSubmitParams): Promise<void> {
  const stepCache = new Map<string, string>();
  const pathKeys = new Set<string>();

  for (const line of lines) {
    if (line.parse.pathKey) pathKeys.add(line.parse.pathKey);
  }

  const sortedKeys = Array.from(pathKeys).sort(
    (a, b) => a.split("//").length - b.split("//").length
  );

  const leafPhaseIdByPathKey = new Map<string, string | null>();

  for (const pathKey of sortedKeys) {
    const segmentsWithMask = mergeComposerPathCreateMasks(lines, pathKey);
    if (!segmentsWithMask) continue;

    const createMask = segmentsWithMask.map((s) => s.create);
    const leafId = await resolvePathToLeafPhaseId(
      segmentsWithMask,
      createMask,
      parentPhaseId,
      stepCache,
      phases,
      projectId,
      mutations.createPhase
    );
    leafPhaseIdByPathKey.set(pathKey, leafId);
  }

  const resolvePhaseId = (line: ParsedProjectLine): string | null => {
    const key = line.parse.pathKey;
    if (key) {
      return leafPhaseIdByPathKey.get(key) ?? defaultPhaseId ?? parentPhaseId;
    }
    return defaultPhaseId ?? parentPhaseId;
  };

  const tasks = lines.map((line) => ({
    title: line.parse.title,
    scheduledDate: line.parse.scheduledDate,
    bucketOverride: line.parse.bucketOverride,
    priority: line.parse.priority,
    phaseId: resolvePhaseId(line),
  }));

  if (tasks.length === 1) {
    const t = tasks[0]!;
    await mutations.createTask({
      title: t.title,
      projectId,
      phaseId: t.phaseId,
      priority: t.priority,
      scheduledDate: t.scheduledDate,
      bucketOverride: t.bucketOverride,
    });
    return;
  }

  if (tasks.length >= 2) {
    await mutations.bulkCreateTasks({ projectId, tasks });
  }
}
