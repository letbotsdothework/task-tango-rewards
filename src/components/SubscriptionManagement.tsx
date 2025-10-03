import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Check, Zap, Crown, Shield, Loader2, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionManagementProps {
  householdId: string;
  userRole: string;
}

const plans = [
  {
    id: 'free',
    name: 'Basis',
    price: '0€',
    interval: 'kostenlos',
    icon: Shield,
    priceId: null,
    features: [
      'Bis zu 10 aktive Aufgaben',
      'Grundlegende Belohnungen',
      'Bis zu 5 Haushaltsmitglieder',
      'Basis-Rangliste'
    ],
    color: 'text-muted-foreground'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '4,99€',
    interval: 'pro Monat',
    icon: Zap,
    priceId: 'price_1SE5nbQ3CK1F4xQw5BomKeun',
    features: [
      'Unbegrenzte Aufgaben',
      '🎰 Mystery Rewards (Glücksrad)',
      'Unbegrenzte Haushaltsmitglieder',
      'Erweiterte Statistiken',
      'Aufgaben-Kategorien',
      'Wiederkehrende Aufgaben'
    ],
    color: 'text-primary',
    recommended: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '9,99€',
    interval: 'pro Monat',
    icon: Crown,
    priceId: 'price_1SE5nuQ3CK1F4xQwqBtiKcfr',
    features: [
      'Alle Pro-Features',
      'Prioritäts-Support',
      'Erweiterte Analysen',
      'Aufgaben-Automatisierung',
      'Team-Challenges',
      'Custom Branding'
    ],
    color: 'text-accent'
  }
];

export const SubscriptionManagement = ({ householdId, userRole }: SubscriptionManagementProps) => {
  const { toast } = useToast();
  const { subscription, loading: subLoading, refresh } = useSubscription(householdId);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string, priceId: string | null) => {
    if (userRole !== 'admin') {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Admins können die Subscription ändern.",
        variant: "destructive",
      });
      return;
    }

    if (!priceId) {
      toast({
        title: "Info",
        description: "Der kostenlose Plan ist bereits aktiv.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, householdId }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Checkout geöffnet",
          description: "Bitte schließen Sie den Zahlungsvorgang im neuen Tab ab.",
        });
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Fehler",
        description: error.message || "Subscription konnte nicht gestartet werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (userRole !== 'admin') {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Admins können die Subscription verwalten.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { householdId }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Portal geöffnet",
          description: "Verwalten Sie Ihre Subscription im neuen Tab.",
        });
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Fehler",
        description: error.message || "Portal konnte nicht geöffnet werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for subscription success/cancel in URL
    const params = new URLSearchParams(window.location.search);
    const status = params.get('subscription');
    
    if (status === 'success') {
      toast({
        title: "Subscription erfolgreich!",
        description: "Ihr Plan wurde erfolgreich aktiviert.",
      });
      refresh();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'canceled') {
      toast({
        title: "Abgebrochen",
        description: "Der Zahlungsvorgang wurde abgebrochen.",
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (subLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Wähle deinen Plan</h2>
        <p className="text-muted-foreground">
          Erweitere die Funktionen deines Haushalts
        </p>
        {subscription.hasActiveSub && subscription.subscriptionEnd && (
          <Badge variant="secondary" className="mt-2">
            Aktiv bis {new Date(subscription.subscriptionEnd).toLocaleDateString('de-DE')}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = subscription.plan === plan.id;
          
          return (
            <Card 
              key={plan.id}
              className={`relative ${plan.recommended ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.recommended && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  Empfohlen
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Icon className={`w-12 h-12 ${plan.color}`} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.interval}</span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled
                  >
                    Aktueller Plan
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${plan.recommended ? 'bg-gradient-primary' : ''}`}
                    onClick={() => handleSubscribe(plan.id, plan.priceId)}
                    disabled={loading || userRole !== 'admin'}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      plan.id === 'free' ? 'Zu Basis wechseln' : 'Jetzt upgraden'
                    )}
                  </Button>
                )}

                {userRole !== 'admin' && !isCurrentPlan && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Nur Admins können den Plan ändern
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {subscription.hasActiveSub && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Subscription verwalten</h3>
                <p className="text-sm text-muted-foreground">
                  Zahlungsmethoden ändern, Rechnungen ansehen oder kündigen
                </p>
              </div>
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                disabled={loading || userRole !== 'admin'}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Portal öffnen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Zahlungsinformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Sichere Zahlung über Stripe</p>
            <p>• Jederzeit kündbar</p>
            <p>• Keine versteckten Kosten</p>
            <p>• 14 Tage Geld-zurück-Garantie</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};