import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's household
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.household_id) {
      logStep("No household found, returning free plan");
      return new Response(JSON.stringify({ 
        plan: 'free', 
        status: 'active',
        hasActiveSub: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found household", { householdId: profile.household_id });

    // Get household subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from('household_subscriptions')
      .select('*')
      .eq('household_id', profile.household_id)
      .single();

    if (subError) {
      logStep("Error fetching subscription", { error: subError });
      // If no subscription exists, create a free one
      if (subError.code === 'PGRST116') {
        const { data: newSub } = await supabaseClient
          .from('household_subscriptions')
          .insert({
            household_id: profile.household_id,
            plan: 'free',
            status: 'active'
          })
          .select()
          .single();
        
        logStep("Created free subscription");
        return new Response(JSON.stringify({ 
          plan: 'free', 
          status: 'active',
          hasActiveSub: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw subError;
    }

    // If there's a Stripe subscription ID, check its status with Stripe
    if (subscription.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      logStep("Fetching Stripe subscription", { subId: subscription.stripe_subscription_id });

      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        logStep("Retrieved Stripe subscription", { status: stripeSubscription.status });

        // Update local database if status changed
        if (stripeSubscription.status !== subscription.status) {
          const newStatus = stripeSubscription.status === 'active' ? 'active' :
                           stripeSubscription.status === 'canceled' ? 'canceled' :
                           stripeSubscription.status === 'past_due' ? 'past_due' : 'incomplete';

          await supabaseClient
            .from('household_subscriptions')
            .update({ 
              status: newStatus,
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
            })
            .eq('id', subscription.id);

          logStep("Updated subscription status", { newStatus });
        }

        // Determine plan from Stripe subscription
        const priceId = stripeSubscription.items.data[0]?.price.id;
        let plan = subscription.plan; // Default to existing
        
        if (priceId === 'price_1SE5nbQ3CK1F4xQw5BomKeun') {
          plan = 'pro';
        } else if (priceId === 'price_1SE5nuQ3CK1F4xQwqBtiKcfr') {
          plan = 'premium';
        }

        return new Response(JSON.stringify({
          plan,
          status: stripeSubscription.status,
          hasActiveSub: stripeSubscription.status === 'active',
          subscriptionEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (stripeError: any) {
        logStep("Stripe error", { error: stripeError.message });
        // If subscription not found in Stripe, reset to free
        if (stripeError.code === 'resource_missing') {
          await supabaseClient
            .from('household_subscriptions')
            .update({ 
              plan: 'free',
              status: 'canceled',
              stripe_subscription_id: null
            })
            .eq('id', subscription.id);
        }
      }
    }

    // Return current database subscription
    logStep("Returning database subscription", { plan: subscription.plan });
    return new Response(JSON.stringify({
      plan: subscription.plan,
      status: subscription.status,
      hasActiveSub: subscription.status === 'active' && subscription.plan !== 'free',
      subscriptionEnd: subscription.current_period_end
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});