-- Allow anonymous users to view household names for valid invites
CREATE POLICY "Anyone can view household names for active invites"
ON public.households
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.household_invites
    WHERE household_invites.household_id = households.id
    AND household_invites.is_accepted = false
    AND household_invites.expires_at > now()
  )
);

-- Allow anonymous users to view profile display names for inviters
CREATE POLICY "Anyone can view inviter display names"
ON public.profiles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.household_invites
    WHERE household_invites.invited_by = profiles.id
    AND household_invites.is_accepted = false
    AND household_invites.expires_at > now()
  )
);