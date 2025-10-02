-- Fix the WITH CHECK condition for accepting invites
-- The problem: WITH CHECK requires is_accepted = false, but we're setting it to true
DROP POLICY IF EXISTS "Invited user can accept invite" ON public.household_invites;

CREATE POLICY "Invited user can accept invite"
ON public.household_invites
FOR UPDATE
TO authenticated
USING (
  is_accepted = false 
  AND expires_at > now() 
  AND lower(invited_email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  -- Allow setting is_accepted to true
  expires_at > now() 
  AND lower(invited_email) = lower(auth.jwt() ->> 'email')
);