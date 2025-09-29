-- Add new columns to tasks table for enhanced functionality
ALTER TABLE public.tasks 
ADD COLUMN assignment_type text DEFAULT 'individual' CHECK (assignment_type IN ('individual', 'group', 'rotation')),
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_pattern text CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly') OR recurrence_pattern IS NULL),
ADD COLUMN next_occurrence timestamp with time zone,
ADD COLUMN rotation_order integer,
ADD COLUMN is_private boolean DEFAULT false,
ADD COLUMN icon text,
ADD COLUMN color text,
ADD COLUMN image_url text,
ADD COLUMN notes text,
ADD COLUMN is_challenge boolean DEFAULT false,
ADD COLUMN bonus_points integer DEFAULT 0,
ADD COLUMN challenge_deadline timestamp with time zone,
ADD COLUMN custom_category text;

-- Create categories table for expandable categories
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  color text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Users can view categories in their household" 
ON public.categories 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.household_id = categories.household_id
));

CREATE POLICY "Users can create categories in their household" 
ON public.categories 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.household_id = categories.household_id
) AND created_by = auth.uid());

CREATE POLICY "Users can update categories in their household" 
ON public.categories 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.household_id = categories.household_id
));

-- Create reminders table
CREATE TABLE public.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  reminder_time timestamp with time zone NOT NULL,
  is_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for reminders
CREATE POLICY "Users can view reminders for tasks in their household" 
ON public.reminders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tasks 
  JOIN profiles ON profiles.household_id = tasks.household_id 
  WHERE tasks.id = reminders.task_id 
  AND profiles.user_id = auth.uid()
));

-- Create task_completions table for tracking who completed group tasks
CREATE TABLE public.task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  completed_by uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  points_awarded integer NOT NULL
);

-- Enable RLS for task_completions
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Create policy for task_completions
CREATE POLICY "Users can view task completions in their household" 
ON public.task_completions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tasks 
  JOIN profiles ON profiles.household_id = tasks.household_id 
  WHERE tasks.id = task_completions.task_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can create task completions for tasks in their household" 
ON public.task_completions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks 
  JOIN profiles ON profiles.household_id = tasks.household_id 
  WHERE tasks.id = task_completions.task_id 
  AND profiles.user_id = auth.uid()
) AND completed_by = auth.uid());

-- Add triggers for timestamps
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add default categories for existing households
INSERT INTO public.categories (household_id, name, icon, color, created_by)
SELECT DISTINCT 
  h.id as household_id,
  cat.name,
  cat.icon,
  cat.color,
  h.created_by
FROM households h
CROSS JOIN (
  VALUES 
    ('Küche', '🍽️', '#FF6B6B'),
    ('Bad', '🚿', '#4ECDC4'),
    ('Wäsche', '👕', '#45B7D1'),
    ('Einkauf', '🛒', '#96CEB4'),
    ('Müll', '🗑️', '#FFEAA7'),
    ('Reinigung', '🧹', '#DDA0DD'),
    ('Garten', '🌱', '#98D8C8'),
    ('Organisatorisches', '📋', '#F7DC6F'),
    ('Sonstiges', '📦', '#BB8FCE')
) AS cat(name, icon, color);