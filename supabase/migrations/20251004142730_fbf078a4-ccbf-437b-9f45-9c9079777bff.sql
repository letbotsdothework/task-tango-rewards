-- Add avatar system to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT NULL;

-- Create custom mystery rewards table for self-defined prizes
CREATE TABLE IF NOT EXISTS mystery_custom_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on custom rewards
ALTER TABLE mystery_custom_rewards ENABLE ROW LEVEL SECURITY;

-- Admins can create custom rewards
CREATE POLICY "Admins can create custom rewards"
ON mystery_custom_rewards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = mystery_custom_rewards.household_id
    AND profiles.role = 'admin'
  )
);

-- Admins can update custom rewards
CREATE POLICY "Admins can update custom rewards"
ON mystery_custom_rewards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = mystery_custom_rewards.household_id
    AND profiles.role = 'admin'
  )
);

-- Admins can delete custom rewards
CREATE POLICY "Admins can delete custom rewards"
ON mystery_custom_rewards
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = mystery_custom_rewards.household_id
    AND profiles.role = 'admin'
  )
);

-- Household members can view custom rewards
CREATE POLICY "Household members can view custom rewards"
ON mystery_custom_rewards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = mystery_custom_rewards.household_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_mystery_custom_rewards_updated_at
BEFORE UPDATE ON mystery_custom_rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();