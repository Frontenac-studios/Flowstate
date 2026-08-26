-- W4 double-bill guard, moved from convention to the DB row level.
--
-- Invariant: `time_entries.invoice_id` is write-once. It may transition
--   NULL -> an invoice     (accepting a draft bills the entry), and
--   an invoice -> NULL      (voiding an invoice releases the entry),
-- but it may NEVER move directly from one invoice to a *different* invoice.
-- That single rule is exactly "an entry is attached to at most one invoice and
-- is never re-billed": the only way to move billed time onto a new invoice is to
-- void the first (which clears the link) and re-bill the now-free entry.
--
-- Why a trigger and not a unique/partial index (the word in docs/v1-scope.md W4):
-- `invoice_id` is a single scalar column, so "at most one invoice per entry" is
-- already structurally true — a partial unique index would have to key on the
-- primary key and would be a no-op. The plan's "unique/partial index" wording
-- assumed a line-per-entry join table that this schema does not use. The real
-- double-bill vector is a reassigning UPDATE that overwrites an already-set
-- invoice_id, bypassing the router's `WHERE invoice_id IS NULL` convention. Only
-- a row-level trigger can compare OLD vs NEW and forbid that; a CHECK constraint
-- cannot see OLD, and no index can express immutability.
--
-- The router's conditional UPDATE stays as the first line of defence (it keeps a
-- concurrent bill a clean CONFLICT rather than a raised exception); this trigger
-- is the backstop that makes the guarantee hold no matter which code path writes.

CREATE OR REPLACE FUNCTION time_entries_invoice_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.invoice_id IS NOT NULL
     AND NEW.invoice_id IS NOT NULL
     AND NEW.invoice_id <> OLD.invoice_id THEN
    RAISE EXCEPTION
      'time_entries.invoice_id is immutable once set (entry %, already billed on invoice %); void that invoice to release the entry before re-billing',
      OLD.id, OLD.invoice_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER time_entries_invoice_id_immutable
  BEFORE UPDATE OF invoice_id ON "time_entries"
  FOR EACH ROW
  EXECUTE FUNCTION time_entries_invoice_id_immutable();
