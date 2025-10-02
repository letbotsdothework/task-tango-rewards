-- Fix infinite recursion in RLS policies
-- The issue: household_invites policies check profiles, and profiles policies check household_invites
-- This creates circular dependency causing infinite recursion

-- 1. Create security definer function to check household membership
CREATE OR REPLACE FUNCTION public.user_in_household(_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND household_id = _household_id
  );
$$;

-- 2. Fix household_invites policies
DROP POLICY IF EXISTS "Members and invited users can view invites (auth)" ON public.household_invites;

-- Household members can view invites using the security definer function
CREATE POLICY "Members can view household invites"
ON public.household_invites
FOR SELECT
TO authenticated
USING (public.user_in_household(household_id));

-- Invited users can view their own invite by email
CREATE POLICY "Invited users can view their invite by email"
ON public.household_invites
FOR SELECT
TO authenticated
USING (lower(invited_email) = lower(auth.jwt() ->> 'email'));

-- 3. Fix profiles policies - drop the circular "inviter display names" policies
DROP POLICY IF EXISTS "Anyone can view inviter display names (anon)" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view inviter display names (auth)" ON public.profiles;

-- Instead, allow viewing profiles in the same household (already exists)
-- and add a simpler policy for viewing your own profile
CREATE POLICY "Users can view their own profile always"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Fix households policies - ensure they don't cause recursion
DROP POLICY IF EXISTS "Anyone can view household names for active invites (auth)" ON public.households;

-- Authenticated users can view households if they have an active invite
CREATE POLICY "Users with invites can view household names"
ON public.households
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM household_invites hi
    WHERE hi.household_id = households.id
      AND lower(hi.invited_email) = lower(auth.jwt() ->> 'email')
      AND hi.is_accepted = false
      AND hi.expires_at > now()
  )
);
