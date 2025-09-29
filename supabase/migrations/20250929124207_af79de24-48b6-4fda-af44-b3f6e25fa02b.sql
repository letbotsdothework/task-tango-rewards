-- Create household_invites table for secure invitations
CREATE TABLE public.household_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL,
  invited_email text NOT NULL,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  is_accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(household_id, invited_email, is_accepted) -- Prevent duplicate active invites
);

-- Enable RLS
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Only household admins can create invites
CREATE POLICY "Admins can create invites for their household" 
ON public.household_invites 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.household_id = household_invites.household_id 
    AND profiles.role = 'admin'
  )
  AND invited_by = auth.uid()
);

-- Household members can view invites for their household
CREATE POLICY "Users can view invites for their household" 
ON public.household_invites 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.household_id = household_invites.household_id
  )
);

-- Allow public access for accepting invites (via token)
CREATE POLICY "Public can access valid invites by token" 
ON public.household_invites 
FOR SELECT 
USING (
  expires_at > now() 
  AND is_accepted = false
);

-- Allow updating invite status when accepting
CREATE POLICY "Public can accept valid invites" 
ON public.household_invites 
FOR UPDATE 
USING (
  expires_at > now() 
  AND is_accepted = false
);

-- Add trigger for updated_at
CREATE TRIGGER update_household_invites_updated_at
BEFORE UPDATE ON public.household_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_household_invites_token ON public.household_invites(invite_token);
CREATE INDEX idx_household_invites_email ON public.household_invites(invited_email);
CREATE INDEX idx_household_invites_expires ON public.household_invites(expires_at);