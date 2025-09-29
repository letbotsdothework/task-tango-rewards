-- Add created_by to households and fix RLS so creators can read their new rows
-- 1) Schema changes
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) Trigger to set created_by automatically
CREATE OR REPLACE FUNCTION public.set_households_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_households_created_by ON public.households;
CREATE TRIGGER tr_set_households_created_by
BEFORE INSERT ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.set_households_created_by();

-- 3) RLS policies
-- Ensure authenticated users can insert only their own rows
DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;
CREATE POLICY "Authenticated users can create households"
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow users to view their household or any household they created (for immediate read-after-insert)
DROP POLICY IF EXISTS "Users can view their household" ON public.households;
CREATE POLICY "Users can view their household"
ON public.households
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = households.id
  )
  OR households.created_by = auth.uid()
);
