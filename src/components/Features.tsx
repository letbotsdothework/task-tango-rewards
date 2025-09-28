import { Card } from "@/components/ui/card";
import { CheckCircle, Users, Trophy, Bell, Calendar, BarChart3 } from "lucide-react";

const features = [
  {
    icon: CheckCircle,
    title: "Smart Task Assignment",
    description: "Automatically distribute tasks fairly based on availability, skills, and preferences.",
    color: "text-primary"
  },
  {
    icon: Trophy,
    title: "Gamified Rewards",
    description: "Earn points for completed tasks and unlock rewards that matter to your household.",
    color: "text-secondary"
  },
  {
    icon: Users,
    title: "Family Leaderboards",
    description: "Friendly competition with real-time rankings to motivate everyone.",
    color: "text-success"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Gentle nudges at the right time to keep everyone on track without nagging.",
    color: "text-primary"
  },
  {
    icon: Calendar,
    title: "Calendar Integration",
    description: "Sync with Google Calendar and never miss a deadline again.",
    color: "text-secondary"
  },
  {
    icon: BarChart3,
    title: "Detailed Analytics",
    description: "Track patterns, identify bottlenecks, and optimize your household workflow.",
    color: "text-success"
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Everything You Need to
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Revolutionize Chores
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            TaskTango combines the best of task management with game mechanics 
            to make household organization actually enjoyable.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-medium transition-all duration-300 hover:scale-105 border-0 bg-card/50 backdrop-blur-sm"
            >
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-current/10 to-current/5 flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
            <CheckCircle className="w-4 h-4" />
            Free for the first 7 days
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;