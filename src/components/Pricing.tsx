import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for getting started",
    icon: Star,
    features: [
      "Up to 3 family members",
      "Basic task assignment",
      "Simple point system",
      "Mobile app access",
      "Email support"
    ],
    cta: "Get Started",
    variant: "outline" as const,
    popular: false
  },
  {
    name: "Premium",
    price: "4.99",
    description: "Most popular for families",
    icon: Zap,
    features: [
      "Unlimited family members",
      "Advanced analytics",
      "Custom rewards",
      "Calendar integration",
      "Priority support",
      "Recurring task automation",
      "Performance insights"
    ],
    cta: "Start Free Trial",
    variant: "hero" as const,
    popular: true
  },
  {
    name: "Family Plus",
    price: "9.99",
    description: "For larger households",
    icon: Crown,
    features: [
      "Everything in Premium",
      "Up to 10 family members",
      "Advanced automations",
      "API access",
      "Custom integrations",
      "24/7 support",
      "White-label options"
    ],
    cta: "Contact Sales",
    variant: "success" as const,
    popular: false
  }
];

const Pricing = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Simple, Fair
            <span className="block bg-gradient-hero bg-clip-text text-transparent">
              Pricing for Everyone
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free and upgrade when your family grows. 
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative p-8 transition-all duration-300 hover:scale-105 ${
                plan.popular 
                  ? 'border-primary shadow-glow bg-card' 
                  : 'border-border hover:shadow-medium bg-card/50 backdrop-blur-sm'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <div className="text-center space-y-4 mb-8">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  plan.popular 
                    ? 'bg-gradient-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <plan.icon className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-muted-foreground">{plan.description}</p>
                
                <div className="space-y-1">
                  <div className="text-4xl font-bold">
                    ${plan.price}
                    <span className="text-xl text-muted-foreground font-normal">/month</span>
                  </div>
                  {plan.price !== "0" && (
                    <p className="text-sm text-muted-foreground">Billed monthly</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                variant={plan.variant} 
                size="lg" 
                className="w-full"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Bottom info */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-muted-foreground">
            All plans include a 7-day free trial. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              No setup fees
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              99.9% uptime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;