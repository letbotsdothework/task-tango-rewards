-- Add role management policies for profiles table
-- Only admins can update other users' roles
DROP POLICY IF EXISTS "Admins can update member roles in their household" ON public.profiles;
CREATE POLICY "Admins can update member roles in their household"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.household_id = profiles.household_id
    AND admin_profile.role = 'admin'
  )
);

-- Update tasks policies to include moderator permissions
DROP POLICY IF EXISTS "Users can create tasks in their household" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks in their household" ON public.tasks;
CREATE POLICY "Admins and moderators can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = tasks.household_id
    AND profiles.role IN ('admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "Users can update tasks in their household" ON public.tasks;
DROP POLICY IF EXISTS "Admins and moderators can update tasks" ON public.tasks;
CREATE POLICY "Admins and moderators can update tasks"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = tasks.household_id
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Add delete policy for tasks (only admins)
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
ON public.tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = tasks.household_id
    AND profiles.role = 'admin'
  )
);

-- Update rewards policies
DROP POLICY IF EXISTS "Users can create rewards in their household" ON public.rewards;
DROP POLICY IF EXISTS "Admins can create rewards" ON public.rewards;
CREATE POLICY "Admins can create rewards"
ON public.rewards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = rewards.household_id
    AND profiles.role = 'admin'
  )
);

-- Add update and delete policies for rewards
DROP POLICY IF EXISTS "Admins can update rewards" ON public.rewards;
CREATE POLICY "Admins can update rewards"
ON public.rewards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = rewards.household_id
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete rewards" ON public.rewards;
CREATE POLICY "Admins can delete rewards"
ON public.rewards
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = rewards.household_id
    AND profiles.role = 'admin'
  )
);

-- Update categories policies for moderators
DROP POLICY IF EXISTS "Users can create categories in their household" ON public.categories;
DROP POLICY IF EXISTS "Admins and moderators can create categories" ON public.categories;
CREATE POLICY "Admins and moderators can create categories"
ON public.categories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = categories.household_id
    AND profiles.role IN ('admin', 'moderator')
  ) AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update categories in their household" ON public.categories;
DROP POLICY IF EXISTS "Admins and moderators can update categories" ON public.categories;
CREATE POLICY "Admins and moderators can update categories"
ON public.categories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = categories.household_id
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Add delete policy for categories (only admins)
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.household_id = categories.household_id
    AND profiles.role = 'admin'
  )
);