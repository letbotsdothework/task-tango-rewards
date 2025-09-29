-- Fix infinite recursion in profiles RLS policy by creating a security definer function
CREATE OR REPLACE FUNCTION public.user_can_view_profile(_profile_user_id uuid, _household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (_profile_user_id = auth.uid() OR p.household_id = _household_id)
  );
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their household" ON public.profiles;

CREATE POLICY "Users can view profiles in their household" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (household_id IS NOT NULL AND public.user_can_view_profile(user_id, household_id))
);