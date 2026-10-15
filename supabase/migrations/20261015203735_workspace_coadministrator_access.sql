-- Allow multiple active workspace administrators without moving workspace data.
-- The actual primary owner remains the member whose user_id equals owner_id.
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_owner_is_self;

DROP POLICY IF EXISTS workspace_members_select
  ON public.workspace_members;

CREATE POLICY workspace_members_select
  ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      owner_id = (SELECT public.current_workspace_owner_id())
      AND (SELECT public.current_workspace_role()) = 'owner'::text
    )
  );
