import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SPIN-MYSTERY-WHEEL] ${step}${detailsStr}`);
};

// Available avatars for rewards
const AVATARS = [
  '🦸', '🧙', '🧛', '🧜', '🧚', '👸', '🤴', '👮', '👷', '💂',
  '🕵️', '👨‍🚀', '👨‍🚒', '👨‍⚕️', '👨‍🎓', '👨‍🏫', '👨‍⚖️', '👨‍🌾',
  '👨‍🍳', '👨‍🔧', '👨‍🏭', '👨‍💼', '👨‍🔬', '👨‍💻', '👨‍🎤', '👨‍🎨',
  '🦁', '🐯', '🐻', '🐼', '🐨', '🐸', '🐵', '🐶', '🐱', '🦊',
  '🦄', '🐲', '🦕', '🦖', '🐉', '🦅', '🦉', '🦇', '🐺', '🐗'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { taskId, householdId, taskPoints } = await req.json();
    
    if (!taskId || !householdId) {
      throw new Error("Task ID and Household ID are required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if household has Pro or Premium subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('household_subscriptions')
      .select('plan, status')
      .eq('household_id', householdId)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.plan === 'free') {
      throw new Error("Mystery Rewards are only available for Pro and Premium plans");
    }

    if (subscription.status !== 'active') {
      throw new Error("Subscription is not active");
    }

    logStep("Subscription verified", { plan: subscription.plan });

    // Get mystery reward config
    const { data: configData, error: configError } = await supabaseClient
      .from('mystery_reward_configs')
      .select('*')
      .eq('household_id', householdId)
      .single();

    let finalConfig = configData;

    if (configError) {
      // Create default config if it doesn't exist
      const { data: newConfig, error: createError } = await supabaseClient
        .from('mystery_reward_configs')
        .insert({
          household_id: householdId,
          enabled: true,
          daily_limit: 3,
          probabilities: { 
            double_points: 30, 
            avatars: 25, 
            custom: 20, 
            points: 25 
          }
        })
        .select()
        .single();
      
      if (createError || !newConfig) throw new Error("Failed to create config");
      finalConfig = newConfig;
    }

    if (!finalConfig) throw new Error("Config not found");

    if (!finalConfig.enabled) {
      throw new Error("Mystery Rewards are disabled for this household");
    }

    logStep("Config loaded", { enabled: finalConfig.enabled, dailyLimit: finalConfig.daily_limit });

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error: countError } = await supabaseClient
      .from('mystery_reward_spins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('spun_at', today.toISOString());

    if (countError) {
      logStep("Error checking spin count", { error: countError });
      throw countError;
    }

    const spinCount = count ?? 0;
    logStep("Spin count", { count: spinCount, limit: finalConfig.daily_limit });

    if (spinCount >= finalConfig.daily_limit) {
      throw new Error(`Daily limit reached. You can spin ${finalConfig.daily_limit} times per day.`);
    }

    // Build segments based on probabilities for wheel positioning
    const probabilities = finalConfig.probabilities as { 
      double_points?: number; 
      avatars?: number; 
      custom?: number; 
      points?: number;
    };

    // Get custom rewards with their individual probabilities
    const { data: customRewards } = await supabaseClient
      .from('mystery_custom_rewards')
      .select('*')
      .eq('household_id', householdId);

    // Build segments array with angles
    const segments: Array<{type: string, startAngle: number, endAngle: number, data?: any}> = [];
    let currentAngle = 0;

    // Add double_points segment
    if (probabilities.double_points && probabilities.double_points > 0) {
      const segmentSize = (probabilities.double_points / 100) * 360;
      segments.push({
        type: 'double_points',
        startAngle: currentAngle,
        endAngle: currentAngle + segmentSize
      });
      currentAngle += segmentSize;
    }

    // Add avatars segment
    if (probabilities.avatars && probabilities.avatars > 0) {
      const segmentSize = (probabilities.avatars / 100) * 360;
      segments.push({
        type: 'avatar',
        startAngle: currentAngle,
        endAngle: currentAngle + segmentSize
      });
      currentAngle += segmentSize;
    }

    // Add custom rewards segments (each with its own probability)
    if (customRewards && customRewards.length > 0) {
      for (const reward of customRewards) {
        const rewardProb = reward.probability || 5;
        if (rewardProb > 0) {
          const segmentSize = (rewardProb / 100) * 360;
          segments.push({
            type: 'custom',
            startAngle: currentAngle,
            endAngle: currentAngle + segmentSize,
            data: reward
          });
          currentAngle += segmentSize;
        }
      }
    }

    // Add points segment
    if (probabilities.points && probabilities.points > 0) {
      const segmentSize = (probabilities.points / 100) * 360;
      segments.push({
        type: 'points',
        startAngle: currentAngle,
        endAngle: currentAngle + segmentSize
      });
      currentAngle += segmentSize;
    }

    logStep("Segments built", { totalAngle: currentAngle, segments: segments.length });
    
    // Generate weighted random reward
    const random = Math.random() * 100;
    let rewardType: string;
    let rewardValue: any;
    let targetAngle: number = 0;

    let cumulative = 0;
    if (random < (cumulative += (probabilities.double_points || 0))) {
      rewardType = 'double_points';
      const doubledPoints = (taskPoints || 10) * 2;
      rewardValue = { points: doubledPoints, original: taskPoints || 10 };
      // Find segment and calculate target angle
      const segment = segments.find(s => s.type === 'double_points');
      if (segment) {
        targetAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
      }
      logStep("Generated double points reward", rewardValue);
    } else if (random < (cumulative += (probabilities.avatars || 0))) {
      rewardType = 'avatar';
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      rewardValue = { emoji: avatar, name: `Avatar ${avatar}` };
      // Find segment and calculate target angle
      const segment = segments.find(s => s.type === 'avatar');
      if (segment) {
        targetAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
      }
      logStep("Generated avatar reward", rewardValue);
    } else if (customRewards && customRewards.length > 0) {
      // Calculate total custom probability
      const totalCustomProb = customRewards.reduce((sum, r) => sum + (r.probability || 5), 0);
      let customCumulative = 0;
      let selectedReward = null;

      for (const reward of customRewards) {
        const rewardProb = reward.probability || 5;
        if (random < cumulative + customCumulative + rewardProb) {
          selectedReward = reward;
          break;
        }
        customCumulative += rewardProb;
      }

      if (selectedReward) {
        rewardType = 'custom';
        rewardValue = {
          id: selectedReward.id,
          name: selectedReward.name,
          description: selectedReward.description,
          icon: selectedReward.icon
        };
        // Find the specific custom segment
        const segment = segments.find(s => s.type === 'custom' && s.data?.id === selectedReward.id);
        if (segment) {
          targetAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
        }
        logStep("Generated custom reward", rewardValue);
      } else {
        // Fallback to points
        rewardType = 'points';
        const points = Math.floor(Math.random() * 41) + 10;
        rewardValue = { points };
        const segment = segments.find(s => s.type === 'points');
        if (segment) {
          targetAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
        }
      }
      cumulative += totalCustomProb;
    } else {
      rewardType = 'points';
      // Points: weighted random between 10-50
      const points = Math.floor(Math.random() * 41) + 10;
      rewardValue = { points };
      // Find segment and calculate target angle
      const segment = segments.find(s => s.type === 'points');
      if (segment) {
        targetAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * Math.random();
      }
      logStep("Generated points reward", rewardValue);
    }

    // Record the spin
    const { error: spinError } = await supabaseClient
      .from('mystery_reward_spins')
      .insert({
        user_id: user.id,
        household_id: householdId,
        task_id: taskId,
        reward_type: rewardType,
        reward_value: rewardValue
      });

    if (spinError) {
      logStep("Error recording spin", { error: spinError });
      throw spinError;
    }

    // Handle reward application
    if (rewardType === 'points' || rewardType === 'double_points') {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabaseClient
          .from('profiles')
          .update({ total_points: profile.total_points + rewardValue.points })
          .eq('user_id', user.id);
        
        logStep("Points added to profile", { points: rewardValue.points });
      }
    } else if (rewardType === 'avatar') {
      // Update user's avatar
      await supabaseClient
        .from('profiles')
        .update({ avatar_emoji: rewardValue.emoji })
        .eq('user_id', user.id);
      
      logStep("Avatar updated", { emoji: rewardValue.emoji });
    }

    logStep("Spin completed successfully", { rewardType, targetAngle });

    return new Response(JSON.stringify({
      rewardType,
      rewardValue,
      targetAngle,
      remainingSpins: finalConfig.daily_limit - (spinCount + 1)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in spin-mystery-wheel", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});