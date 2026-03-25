-- Migration: Comprehensive RLS audit and policy patch
-- Depends on: 20260325000000_mssp_tenant_schema.sql (US-001)
--             20260325000001_rbac_schema.sql (US-004)
--
-- This migration:
--   1. Enables RLS on any public schema table that doesn't have it yet
--   2. Ensures accounts_extensions, clients, and account_role_assignments have complete policies
--   3. Verifies immutable timestamp triggers are in place

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: ensure RLS is enabled on all public schema tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on any table in the public schema that is missing it.
-- This is a defensive measure; tables created by US-001/US-004 already have it.
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
    RAISE NOTICE 'Enabled RLS on %.%', tbl.schemaname, tbl.tablename;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- accounts_extensions — full policy set
-- (Idempotent: drop-and-recreate pattern)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.accounts_extensions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "accounts_extensions_select" ON public.accounts_extensions;
DROP POLICY IF EXISTS "accounts_extensions_insert" ON public.accounts_extensions;
DROP POLICY IF EXISTS "accounts_extensions_update" ON public.accounts_extensions;
DROP POLICY IF EXISTS "accounts_extensions_delete" ON public.accounts_extensions;

-- SELECT: user must be a member of the account
CREATE POLICY "accounts_extensions_select"
  ON public.accounts_extensions
  FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: user must be a member of the account they're inserting for
CREATE POLICY "accounts_extensions_insert"
  ON public.accounts_extensions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: user must be a member of the account
CREATE POLICY "accounts_extensions_update"
  ON public.accounts_extensions
  FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: user must be a member of the account
CREATE POLICY "accounts_extensions_delete"
  ON public.accounts_extensions
  FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- clients — full policy set
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

-- SELECT: caller's account membership must include the client's account_id
CREATE POLICY "clients_select"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: caller must be a member of the target account
CREATE POLICY "clients_insert"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: caller must be a member of the target account
CREATE POLICY "clients_update"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: caller must be a member of the target account
CREATE POLICY "clients_delete"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id
      FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- account_role_assignments — full policy set
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.account_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_assignments_select_own" ON public.account_role_assignments;
DROP POLICY IF EXISTS "role_assignments_select_admin" ON public.account_role_assignments;
DROP POLICY IF EXISTS "role_assignments_insert" ON public.account_role_assignments;
DROP POLICY IF EXISTS "role_assignments_update" ON public.account_role_assignments;
DROP POLICY IF EXISTS "role_assignments_delete" ON public.account_role_assignments;

-- SELECT: own assignments
CREATE POLICY "role_assignments_select_own"
  ON public.account_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: admin override (platform_owner or mssp_admin can see all)
CREATE POLICY "role_assignments_select_admin"
  ON public.account_role_assignments
  FOR SELECT
  TO authenticated
  USING (public.check_mssp_admin_role());

-- INSERT: only mssp_admin+ can grant roles
CREATE POLICY "role_assignments_insert"
  ON public.account_role_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_mssp_admin_role());

-- UPDATE: only mssp_admin+ can modify role assignments
CREATE POLICY "role_assignments_update"
  ON public.account_role_assignments
  FOR UPDATE
  TO authenticated
  USING (public.check_mssp_admin_role())
  WITH CHECK (public.check_mssp_admin_role());

-- DELETE: only mssp_admin+ can revoke roles
CREATE POLICY "role_assignments_delete"
  ON public.account_role_assignments
  FOR DELETE
  TO authenticated
  USING (public.check_mssp_admin_role());

-- ─────────────────────────────────────────────────────────────────────────────
-- Immutable timestamp triggers
-- set_updated_at() was defined in 20260325000000 — reuse it.
-- Add triggers on accounts_extensions and clients if not already present.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_accounts_extensions_updated_at'
      AND tgrelid = 'public.accounts_extensions'::regclass
  ) THEN
    EXECUTE $trig$
      CREATE TRIGGER set_accounts_extensions_updated_at
        BEFORE UPDATE ON public.accounts_extensions
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $trig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_clients_updated_at'
      AND tgrelid = 'public.clients'::regclass
  ) THEN
    EXECUTE $trig$
      CREATE TRIGGER set_clients_updated_at
        BEFORE UPDATE ON public.clients
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $trig$;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification report (runs at migration time, visible in migration output)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)
  INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;

  IF v_count > 0 THEN
    RAISE WARNING 'RLS audit: % public table(s) still without RLS — investigate', v_count;
  ELSE
    RAISE NOTICE 'RLS audit: all public schema tables have RLS enabled';
  END IF;
END;
$$;
