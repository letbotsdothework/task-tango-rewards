-- Fix RLS policy for households table to allow authenticated users to create households
DROP POLICY IF EXISTS "Users can create households" ON public.households;

CREATE POLICY "Authenticated users can create households" 
ON public.households 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure the select policy works properly for household creators
DROP POLICY IF EXISTS "Users can view their household" ON public.households;

CREATE POLICY "Users can view their household" 
ON public.households 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.household_id = households.id
  )
);