-- Create enum for reward types
CREATE TYPE public.mystery_reward_type AS ENUM ('points', 'badge', 'voucher', 'special');

-- Create mystery_reward_spins table
CREATE TABLE public.mystery_reward_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reward_type public.mystery_reward_type NOT NULL,
  reward_value JSONB NOT NULL,
  spun_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mystery_reward_configs table
CREATE TABLE public.mystery_reward_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  daily_limit INTEGER NOT NULL DEFAULT 3,
  probabilities JSONB NOT NULL DEFAULT '{"points": 70, "badges": 20, "vouchers": 8, "special": 2}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mystery_reward_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_reward_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mystery_reward_spins
-- Users can view their own spins
CREATE POLICY "Users can view their spins"
ON public.mystery_reward_spins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view household spins
CREATE POLICY "Users can view household spins"
ON public.mystery_reward_spins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = mystery_reward_spins.household_id
  )
);

-- Users can create their own spins
CREATE POLICY "Users can create spins"
ON public.mystery_reward_spins
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for mystery_reward_configs
-- Household members can view config
CREATE POLICY "Household members can view config"
ON public.mystery_reward_configs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = mystery_reward_configs.household_id
  )
);

-- Only admins can update config
CREATE POLICY "Admins can update config"
ON public.mystery_reward_configs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = mystery_reward_configs.household_id
      AND profiles.role = 'admin'
  )
);

-- Only admins can insert config
CREATE POLICY "Admins can create config"
ON public.mystery_reward_configs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = mystery_reward_configs.household_id
      AND profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_mystery_reward_configs_updated_at
BEFORE UPDATE ON public.mystery_reward_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default configs for existing households with Pro/Premium plans
INSERT INTO public.mystery_reward_configs (household_id, enabled)
SELECT household_id, true
FROM public.household_subscriptions
WHERE plan IN ('pro', 'premium')
  AND NOT EXISTS (
    SELECT 1 FROM public.mystery_reward_configs
    WHERE mystery_reward_configs.household_id = household_subscriptions.household_id
  );