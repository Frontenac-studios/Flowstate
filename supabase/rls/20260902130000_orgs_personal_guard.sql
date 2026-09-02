-- Teaches handle_new_user_org about `orgs.personal_for_user_id` (drizzle/0059).
--
-- The trigger and ensureOrgForUser() are the only two ways an org comes into
-- existence, and both create the same thing: a user's implicit personal org. If
-- only one of them stamped the marker the invariant would be half-true — the
-- server path would be guarded and the trigger path would not — so they are kept
-- in step here.
--
-- Same reasoning as the original file: this lives in supabase/rls/ rather than
-- supabase/migrations/ because it references public tables Drizzle owns, and it
-- must run after drizzle/0059 has added the column.
--
-- Idempotent (CREATE OR REPLACE); safe to re-run alongside
-- 20260805120000_orgs_rls.sql, which stays the home of the policies themselves.
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.orgs (name, personal_for_user_id)
  VALUES ('Personal', NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;
