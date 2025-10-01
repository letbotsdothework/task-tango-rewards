-- Allow unauthenticated users to view household invites using the invite token
-- This is necessary for the invite acceptance flow to work for new users
CREATE POLICY "Anyone can view invites with valid token"
ON public.household_invites
FOR SELECT
TO anon
USING (
  invite_token IS NOT NULL
  AND is_accepted = false
  AND expires_at > now()
);