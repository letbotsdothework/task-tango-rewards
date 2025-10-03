-- Update RLS policy for rewards table to only allow admins and moderators to create rewards
DROP POLICY IF EXISTS "Admins can create rewards" ON public.rewards;

CREATE POLICY "Admins and moderators can create rewards"
ON public.rewards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = rewards.household_id
      AND profiles.role IN ('admin', 'moderator')
  )
);