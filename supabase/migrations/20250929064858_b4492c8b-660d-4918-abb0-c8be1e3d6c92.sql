-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create task_priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Create task_status enum  
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

-- Create households table
CREATE TABLE public.households (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    total_points INTEGER NOT NULL DEFAULT 0,
    role public.app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    priority public.task_priority NOT NULL DEFAULT 'medium',
    status public.task_status NOT NULL DEFAULT 'pending',
    points INTEGER NOT NULL DEFAULT 10,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rewards table for available rewards
CREATE TABLE public.rewards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward_claims table to track when rewards are claimed
CREATE TABLE public.reward_claims (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    claimed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for households
CREATE POLICY "Users can view their household" ON public.households
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = households.id
        )
    );

CREATE POLICY "Users can create households" ON public.households
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Household admins can update their household" ON public.households
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = households.id 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their household" ON public.profiles
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles p2 
            WHERE p2.user_id = auth.uid() 
            AND p2.household_id = profiles.household_id
        )
    );

CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their household" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = tasks.household_id
        )
    );

CREATE POLICY "Users can create tasks in their household" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = tasks.household_id
        )
    );

CREATE POLICY "Users can update tasks in their household" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = tasks.household_id
        )
    );

-- RLS Policies for rewards
CREATE POLICY "Users can view rewards in their household" ON public.rewards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = rewards.household_id
        )
    );

CREATE POLICY "Users can create rewards in their household" ON public.rewards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.household_id = rewards.household_id
        )
    );

-- RLS Policies for reward_claims
CREATE POLICY "Users can view reward claims in their household" ON public.reward_claims
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.rewards r ON r.id = reward_claims.reward_id
            WHERE p.user_id = auth.uid() 
            AND p.household_id = r.household_id
        )
    );

CREATE POLICY "Users can create their own reward claims" ON public.reward_claims
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.id = reward_claims.claimed_by
        )
    );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_households_updated_at
    BEFORE UPDATE ON public.households
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON public.rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.households;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_claims;