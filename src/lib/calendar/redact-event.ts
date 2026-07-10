type EventVisibility = "public" | "private" | "default";

export type RedactableEventFields = {
  title: string | null;
  location: string | null;
  visibility: EventVisibility;
};

export type RedactedEventFields = {
  title: string | null;
  location: string | null;
  visibility: EventVisibility;
};

/** Private events are opaque to the client; planning still treats them as busy. */
export function redactEventFields(event: RedactableEventFields): RedactedEventFields {
  if (event.visibility === "private") {
    return { title: null, location: null, visibility: "private" };
  }
  return {
    title: event.title,
    location: event.location,
    visibility: event.visibility,
  };
}
