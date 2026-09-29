"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import Menu, { MenuDivider, MenuItem, MenuLabel } from "@/components/kash/ui/Menu";
import { useDismiss } from "@/hooks/useDismiss";
import { useTagStyles } from "@/hooks/useTagStyles";
import {
  TAG_COLORS,
  TAG_COLOR_LABELS,
  TAG_KINDS,
  TAG_KIND_LABELS,
  groupTagsByKind,
  resolveTagStyle,
  tagColorVars,
  tagKey,
  type TagKind,
} from "@/lib/tasks/tag-styles";
import { normalizeTaskTag } from "@/lib/tasks/tags";
import { useTRPC } from "@/trpc/client";

import { TagChip } from "./TagChip";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/**
 * Spec v3 "Ta" in the task detail: tags grouped by kind (Status, Type, Effort, People,
 * then Other), each row with a "+ Add". A chip opens the tag menu: colour (Gray or a
 * muted colour), kind, rename, and remove from this task.
 */
export default function TaskTagsByKind({ tags, onChange }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const styles = useTagStyles();
  const groups = groupTagsByKind(tags, styles);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<TagKind | "other" | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const refreshStyles = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.taskTags.listStyles.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.taskTags.statusCounts.queryKey() });
  };
  const setStyle = useMutation(
    trpc.taskTags.setStyle.mutationOptions({ onSuccess: refreshStyles })
  );
  const rename = useMutation(
    trpc.taskTags.rename.mutationOptions({
      onSuccess: () => {
        refreshStyles();
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
        void queryClient.invalidateQueries(trpc.tasks.getDetail.pathFilter());
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTagVocabulary.queryKey() });
      },
    })
  );

  const addTag = (raw: string, kind: TagKind | null) => {
    const name = normalizeTaskTag(raw);
    if (!name) return;
    if (!tags.some((t) => tagKey(t) === tagKey(name))) onChange([...tags, name]);
    // A tag added under a kind row takes that kind, unless it already has one.
    if (kind && resolveTagStyle(name, styles).kind === null) setStyle.mutate({ name, kind });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => {
        const rowKey = group.kind ?? "other";
        return (
          <div key={rowKey} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
            <span className="text-meta text-ink-muted">
              {group.kind ? TAG_KIND_LABELS[group.kind] : "Other"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {group.tags.map((tag) =>
                renaming === tag ? (
                  <InlineTagInput
                    key={tag}
                    initial={tag}
                    label={`Rename ${tag}`}
                    onDone={(value) => {
                      setRenaming(null);
                      const next = normalizeTaskTag(value);
                      if (next && tagKey(next) !== tagKey(tag))
                        rename.mutate({ from: tag, to: next });
                    }}
                  />
                ) : (
                  <TagWithMenu
                    key={tag}
                    tag={tag}
                    open={menuFor === tag}
                    onOpenChange={(open) => setMenuFor(open ? tag : null)}
                    onColor={(color) => setStyle.mutate({ name: tag, color })}
                    onKind={(kind) => setStyle.mutate({ name: tag, kind })}
                    onRename={() => setRenaming(tag)}
                    onRemove={() => onChange(tags.filter((t) => t !== tag))}
                  />
                )
              )}
              {addingKind === rowKey ? (
                <InlineTagInput
                  label={`Add ${group.kind ? TAG_KIND_LABELS[group.kind] : "tag"}`}
                  initial=""
                  onDone={(value) => {
                    setAddingKind(null);
                    addTag(value, group.kind);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingKind(rowKey)}
                  className="kash-focus-visible inline-flex h-6 items-center rounded-pill border border-dashed border-check-border px-2.5 text-caption font-semibold text-ink-muted outline-none hover:border-ink-muted hover:text-ink"
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TagWithMenu({
  tag,
  open,
  onOpenChange,
  onColor,
  onKind,
  onRename,
  onRemove,
}: {
  tag: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColor: (color: (typeof TAG_COLORS)[number] | null) => void;
  onKind: (kind: TagKind | null) => void;
  onRename: () => void;
  onRemove: () => void;
}) {
  const styles = useTagStyles();
  const style = resolveTagStyle(tag, styles);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss(open, [menuRef, triggerRef], () => onOpenChange(false));
  const choose = (fn: () => void) => () => {
    fn();
    onOpenChange(false);
  };

  return (
    <span className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${tag} tag options`}
        onClick={() => onOpenChange(!open)}
        className="kash-focus-visible rounded-pill outline-none aria-expanded:shadow-[0_0_0_2px_var(--surface),0_0_0_3px_var(--check-border)]"
      >
        <TagChip name={tag} color={style.color} />
      </button>
      {open ? (
        <Menu
          ref={menuRef}
          id={menuId}
          aria-label={`${tag} tag options`}
          className="absolute left-0 top-full z-overlay mt-1 w-56"
        >
          <MenuLabel>Tag colour</MenuLabel>
          <MenuItem selected={style.color === null} onClick={choose(() => onColor(null))}>
            <ColorSwatch color={null} /> Gray
          </MenuItem>
          {TAG_COLORS.map((color) => (
            <MenuItem
              key={color}
              selected={style.color === color}
              onClick={choose(() => onColor(color))}
            >
              <ColorSwatch color={color} /> {TAG_COLOR_LABELS[color]}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuLabel>Kind</MenuLabel>
          {TAG_KINDS.map((kind) => (
            <MenuItem
              key={kind}
              selected={style.kind === kind}
              onClick={choose(() => onKind(kind))}
            >
              {TAG_KIND_LABELS[kind]}
            </MenuItem>
          ))}
          <MenuItem selected={style.kind === null} onClick={choose(() => onKind(null))}>
            None
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={choose(onRename)}>Rename tag</MenuItem>
          <MenuItem destructive onClick={choose(onRemove)}>
            Remove from task
          </MenuItem>
        </Menu>
      ) : null}
    </span>
  );
}

function ColorSwatch({ color }: { color: (typeof TAG_COLORS)[number] | null }) {
  return (
    <span
      aria-hidden
      className="mr-1 inline-block size-3.5 rounded-pill align-[-2px]"
      style={
        color
          ? { backgroundColor: tagColorVars(color).dot }
          : { backgroundColor: "var(--active-surface)", border: "1px solid var(--outline-border)" }
      }
    />
  );
}

/** A small pill input for adding or renaming; Enter/blur commits, Escape cancels. */
function InlineTagInput({
  initial,
  label,
  onDone,
}: {
  initial: string;
  label: string;
  onDone: (value: string) => void;
}) {
  const trpc = useTRPC();
  const { data: vocabulary = [] } = useQuery(trpc.tasks.listTagVocabulary.queryOptions());
  const [value, setValue] = useState(initial);
  const listId = useId();
  const finished = useRef(false);
  const finish = (next: string) => {
    if (finished.current) return;
    finished.current = true;
    onDone(next);
  };
  return (
    <>
      <input
        autoFocus
        aria-label={label}
        list={listId}
        value={value}
        maxLength={64}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finish(value);
          } else if (e.key === "Escape") {
            finish(initial);
          }
        }}
        className="h-6 w-32 rounded-pill border border-control-border bg-surface px-2.5 text-caption font-semibold text-ink outline-none focus:border-ink"
      />
      <datalist id={listId}>
        {vocabulary.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </>
  );
}
