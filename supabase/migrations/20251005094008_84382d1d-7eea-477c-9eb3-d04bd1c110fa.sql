-- Add probability column to mystery_custom_rewards
ALTER TABLE mystery_custom_rewards
ADD COLUMN IF NOT EXISTS probability integer DEFAULT 5 CHECK (probability >= 0 AND probability <= 100);

-- Update existing mystery_reward_configs to use new probability keys if needed
-- This migration ensures backward compatibility by checking if old keys exist
UPDATE mystery_reward_configs
SET probabilities = jsonb_build_object(
  'double_points', COALESCE((probabilities->>'double_points')::int, (probabilities->>'badges')::int, 30),
  'avatars', COALESCE((probabilities->>'avatars')::int, (probabilities->>'special')::int, 25),
  'custom', COALESCE((probabilities->>'custom')::int, (probabilities->>'vouchers')::int, 20),
  'points', COALESCE((probabilities->>'points')::int, 25)
)
WHERE probabilities IS NOT NULL;