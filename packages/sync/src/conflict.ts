/** Last-write-wins by updated_at (or created_at when updated_at is absent). */
export function pickNewerRow<T extends { updatedAt?: Date | null; createdAt?: Date | null }>(
  local: T,
  remote: T
): "local" | "remote" {
  const localTs = (local.updatedAt ?? local.createdAt)?.getTime() ?? 0;
  const remoteTs = (remote.updatedAt ?? remote.createdAt)?.getTime() ?? 0;
  if (remoteTs > localTs) return "remote";
  if (localTs > remoteTs) return "local";
  return "remote";
}
