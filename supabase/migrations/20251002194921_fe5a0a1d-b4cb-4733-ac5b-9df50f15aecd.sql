-- RLS fixes for invite flow
-- 1) household_invites

-- Drop conflicting/overly broad/incorrect policies
DROP POLICY IF EXISTS "Users can view invites for their household" ON public.household_invites;
DROP POLICY IF EXISTS "Public can access valid invites by token" ON public.household_invites;
DROP POLICY IF EXISTS "Anyone can view invites with valid token" ON public.household_invites;
DROP POLICY IF EXISTS "Public can accept valid invites" ON public.household_invites;

-- Allow anyone (including not logged-in) to view a valid invite by token
CREATE POLICY "Anyone can view invite by token while valid (anon)"
ON public.household_invites
FOR SELECT
TO anon
USING (
  is_accepted = false
  AND expires_at > now()
);

-- Allow authenticated users to view invites either if they are household members or the invited email
CREATE POLICY "Members and invited users can view invites (auth)"
ON public.household_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.household_id = household_invites.household_id
  )
  OR lower(invited_email) = lower(auth.jwt() ->> 'email')
);

-- Only the invited (matching email) can accept while valid
CREATE POLICY "Invited user can accept invite"
ON public.household_invites
FOR UPDATE
TO authenticated
USING (
  is_accepted = false AND expires_at > now()
  AND lower(invited_email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  is_accepted = false AND expires_at > now()
  AND lower(invited_email) = lower(auth.jwt() ->> 'email')
);

-- Keep existing INSERT/DELETE admin policies as-is

-- 2) households

-- Replace view policies to ensure invite page can read household name while invite is valid
DROP POLICY IF EXISTS "Users can view their household" ON public.households;
DROP POLICY IF EXISTS "Anyone can view household names for active invites" ON public.households;

CREATE POLICY "Users can view their household"
ON public.households
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.household_id = households.id
  )
  OR created_by = auth.uid()
);

-- Allow both anon and authenticated to see household name when there's an active invite
CREATE POLICY "Anyone can view household names for active invites (anon)"
ON public.households
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.household_invites hi
    WHERE hi.household_id = households.id
      AND hi.is_accepted = false
      AND hi.expires_at > now()
  )
);

CREATE POLICY "Anyone can view household names for active invites (auth)"
ON public.households
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_invites hi
    WHERE hi.household_id = households.id
      AND hi.is_accepted = false
      AND hi.expires_at > now()
  )
);

-- 3) profiles

-- Fix inviter display-name policy to reference profiles.user_id (not profiles.id), and allow both anon/auth
DROP POLICY IF EXISTS "Anyone can view inviter display names" ON public.profiles;

CREATE POLICY "Anyone can view inviter display names (anon)"
ON public.profiles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.household_invites hi
    WHERE hi.invited_by = profiles.user_id
      AND hi.is_accepted = false
      AND hi.expires_at > now()
  )
);

CREATE POLICY "Anyone can view inviter display names (auth)"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.household_invites hi
    WHERE hi.invited_by = profiles.user_id
      AND hi.is_accepted = false
      AND hi.expires_at > now()
  )
);
