import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Check, Zap, Crown, Shield } from 'lucide-react';

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
    features: [
      'Unbegrenzte Aufgaben',
      'Erweiterte Belohnungen',
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
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (userRole !== 'admin') {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Admins können die Subscription ändern.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement Stripe checkout
      toast({
        title: "Coming Soon",
        description: "Stripe Integration wird implementiert...",
      });
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Fehler",
        description: "Subscription konnte nicht geändert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Wähle deinen Plan</h2>
        <p className="text-muted-foreground">
          Erweitere die Funktionen deines Haushalts
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          
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
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading || userRole !== 'admin'}
                  >
                    {plan.id === 'free' ? 'Zu Basis wechseln' : 'Jetzt upgraden'}
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
