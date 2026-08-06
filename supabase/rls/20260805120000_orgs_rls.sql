-- Tenancy foundation: orgs + org_memberships.
--
-- Lives in supabase/rls/ rather than supabase/migrations/ for the usual reason
-- (migrations run on `supabase start` before Drizzle has created any tables),
-- and because the trigger below references public tables Drizzle owns.
--
-- Reminder on what these policies do and don't cover: the app's own queries run
-- over a direct postgres:// connection, not as the `authenticated` role, so they
-- never evaluate RLS. These policies guard the Supabase-client / PostgREST path.
-- App-layer scoping on ctx.userId remains the real enforcement.

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- Read-only for clients, and only rows you belong to. There are deliberately no
-- INSERT/UPDATE/DELETE policies: nobody joins, leaves, renames or creates an org
-- from the client. Orgs come into existence exactly two ways — the trigger below,
-- or ensureOrgForUser() on the server's own connection.
DROP POLICY IF EXISTS "org_memberships_select_own" ON org_memberships;
CREATE POLICY "org_memberships_select_own" ON org_memberships
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orgs_select_member" ON orgs;
CREATE POLICY "orgs_select_member" ON orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.org_id = orgs.id AND m.user_id = (SELECT auth.uid())
    )
  );

-- `(SELECT auth.uid())` rather than a bare `auth.uid()`: the subquery form is
-- hoisted to an InitPlan and evaluated once per statement instead of once per
-- row. It matters more on the tenant tables in the next PR, but the habit starts
-- here so the two files don't disagree.

-- Every new auth user gets their own org and an owner membership, with no
-- application code in the path. ensureOrgForUser() on the server covers the two
-- cases this trigger can't see: the dev/desktop bypass user (no auth.users row)
-- and any user predating this migration.
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.orgs (name) VALUES ('Personal') RETURNING id INTO new_org_id;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();
