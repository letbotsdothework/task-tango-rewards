-- Add role column to household_invites
ALTER TABLE public.household_invites
ADD COLUMN invited_role app_role NOT NULL DEFAULT 'member'::app_role;

-- Allow admins to delete invites from their household
CREATE POLICY "Admins can delete invites from their household"
ON public.household_invites
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = household_invites.household_id
    AND profiles.role = 'admin'::app_role
  )
);