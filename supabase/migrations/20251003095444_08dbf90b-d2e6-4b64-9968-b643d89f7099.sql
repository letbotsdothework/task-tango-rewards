-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete');

-- Create household_subscriptions table
CREATE TABLE public.household_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(household_id)
);

-- Enable RLS
ALTER TABLE public.household_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for household_subscriptions
-- Household members can view their subscription
CREATE POLICY "Household members can view subscription"
ON public.household_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = household_subscriptions.household_id
  )
);

-- Only admins can update subscription
CREATE POLICY "Admins can update subscription"
ON public.household_subscriptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = household_subscriptions.household_id
      AND profiles.role = 'admin'
  )
);

-- Only admins can insert subscription  
CREATE POLICY "Admins can create subscription"
ON public.household_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.household_id = household_subscriptions.household_id
      AND profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_household_subscriptions_updated_at
BEFORE UPDATE ON public.household_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default free subscription for existing households
INSERT INTO public.household_subscriptions (household_id, plan, status)
SELECT id, 'free'::subscription_plan, 'active'::subscription_status
FROM public.households
WHERE NOT EXISTS (
  SELECT 1 FROM public.household_subscriptions
  WHERE household_subscriptions.household_id = households.id
);