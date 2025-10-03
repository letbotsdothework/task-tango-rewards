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

// Badge catalog
const BADGES = [
  { id: 'chaos_master', name: 'Meister des Chaos', icon: '🎭', description: 'Für besondere Putzleistungen' },
  { id: 'speed_demon', name: 'Blitzschnell', icon: '⚡', description: 'Aufgabe in Rekordzeit erledigt' },
  { id: 'perfect_score', name: 'Perfekt', icon: '💯', description: 'Aufgabe perfekt erledigt' },
  { id: 'early_bird', name: 'Frühaufsteher', icon: '🌅', description: 'Vor 7 Uhr erledigt' },
  { id: 'night_owl', name: 'Nachteule', icon: '🦉', description: 'Nach 22 Uhr erledigt' },
  { id: 'team_player', name: 'Teamplayer', icon: '🤝', description: 'Hilft anderen' },
  { id: 'streak_king', name: 'Streak-König', icon: '🔥', description: '5 Tage in Folge' },
  { id: 'super_hero', name: 'Superheld', icon: '🦸', description: 'Über sich hinausgewachsen' },
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

    const { taskId, householdId } = await req.json();
    
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
          probabilities: { points: 70, badges: 20, vouchers: 8, special: 2 }
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

    // Generate weighted random reward
    const probabilities = finalConfig.probabilities as { points: number; badges: number; vouchers: number; special: number };
    const random = Math.random() * 100;
    let rewardType: string;
    let rewardValue: any;

    let cumulative = 0;
    if (random < (cumulative += probabilities.points)) {
      rewardType = 'points';
      // Points: weighted random between 10-100
      const pointsWeight = [
        { min: 10, max: 30, weight: 50 },  // 50% chance for 10-30 points
        { min: 31, max: 60, weight: 30 },  // 30% chance for 31-60 points
        { min: 61, max: 100, weight: 20 }, // 20% chance for 61-100 points
      ];
      const weightRandom = Math.random() * 100;
      let pointsCumulative = 0;
      let selectedRange = pointsWeight[0];
      for (const range of pointsWeight) {
        if (weightRandom < (pointsCumulative += range.weight)) {
          selectedRange = range;
          break;
        }
      }
      const points = Math.floor(Math.random() * (selectedRange.max - selectedRange.min + 1)) + selectedRange.min;
      rewardValue = { points };
      logStep("Generated points reward", rewardValue);
    } else if (random < (cumulative += probabilities.badges)) {
      rewardType = 'badge';
      const badge = BADGES[Math.floor(Math.random() * BADGES.length)];
      rewardValue = badge;
      logStep("Generated badge reward", rewardValue);
    } else if (random < (cumulative += probabilities.vouchers)) {
      rewardType = 'voucher';
      // Generate voucher code
      const voucherCode = `HAUSHALTS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      rewardValue = {
        code: voucherCode,
        description: '20% Rabatt bei Partner-Shops',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };
      logStep("Generated voucher reward", rewardValue);
    } else {
      rewardType = 'special';
      const specialRewards = [
        { name: 'Familien-Abend', description: 'Plane einen Familien-Abend', icon: '🎬' },
        { name: 'Extra-Auszeit', description: '30 Minuten Pause für alle', icon: '☕' },
        { name: 'Wunschessen', description: 'Wähle das nächste Abendessen', icon: '🍕' },
      ];
      rewardValue = specialRewards[Math.floor(Math.random() * specialRewards.length)];
      logStep("Generated special reward", rewardValue);
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

    // If it's points, add them to the user's profile
    if (rewardType === 'points') {
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
        
        logStep("Points added to profile");
      }
    }

    logStep("Spin completed successfully", { rewardType });

    return new Response(JSON.stringify({
      rewardType,
      rewardValue,
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