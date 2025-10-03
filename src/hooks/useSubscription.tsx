import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  plan: 'free' | 'pro' | 'premium';
  status: string;
  hasActiveSub: boolean;
  subscriptionEnd?: string;
}

export const useSubscription = (householdId: string | null) => {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    plan: 'free',
    status: 'active',
    hasActiveSub: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!householdId) {
      setSubscription({ plan: 'free', status: 'active', hasActiveSub: false });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        setError(error.message);
        setSubscription({ plan: 'free', status: 'active', hasActiveSub: false });
      } else if (data) {
        setSubscription(data);
        setError(null);
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setError('Failed to fetch subscription');
      setSubscription({ plan: 'free', status: 'active', hasActiveSub: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    // Refresh subscription every 60 seconds
    const interval = setInterval(checkSubscription, 60000);

    return () => clearInterval(interval);
  }, [householdId]);

  return {
    subscription,
    loading,
    error,
    refresh: checkSubscription,
    hasPro: subscription.plan === 'pro' || subscription.plan === 'premium',
    hasPremium: subscription.plan === 'premium',
  };
};