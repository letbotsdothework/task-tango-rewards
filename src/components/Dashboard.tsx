import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, CheckCircle, Clock, Users, Gift } from "lucide-react";

const Dashboard = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Your Personal
            <span className="block bg-gradient-secondary bg-clip-text text-transparent">
              Command Center
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how TaskTango transforms your daily routine with beautiful dashboards 
            and engaging progress tracking.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-primary text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary-foreground/80 text-sm">This Week</p>
                      <p className="text-2xl font-bold">1,250</p>
                      <p className="text-primary-foreground/80 text-sm">Points Earned</p>
                    </div>
                    <Trophy className="w-8 h-8 text-primary-foreground/80" />
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-secondary text-secondary-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-secondary-foreground/80 text-sm">Completed</p>
                      <p className="text-2xl font-bold">18/24</p>
                      <p className="text-secondary-foreground/80 text-sm">Tasks</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-secondary-foreground/80" />
                  </div>
                </Card>
                
                <Card className="p-6 bg-gradient-success text-success-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-success-foreground/80 text-sm">Rank</p>
                      <p className="text-2xl font-bold">#2</p>
                      <p className="text-success-foreground/80 text-sm">This Month</p>
                    </div>
                    <Star className="w-8 h-8 text-success-foreground/80" />
                  </div>
                </Card>
              </div>

              {/* Active Tasks */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Today's Tasks</h3>
                <div className="space-y-4">
                  {[
                    { task: "Take out trash", points: 50, status: "completed", assignee: "You" },
                    { task: "Clean kitchen", points: 100, status: "in-progress", assignee: "Sarah" },
                    { task: "Vacuum living room", points: 75, status: "pending", assignee: "Mike" },
                    { task: "Do laundry", points: 80, status: "pending", assignee: "You" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.status === 'completed' ? 'bg-success' :
                          item.status === 'in-progress' ? 'bg-secondary' : 'bg-muted-foreground'
                        }`}></div>
                        <div>
                          <p className="font-medium">{item.task}</p>
                          <p className="text-sm text-muted-foreground">Assigned to {item.assignee}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                          +{item.points} pts
                        </Badge>
                        {item.status === 'completed' && <CheckCircle className="w-5 h-5 text-success" />}
                        {item.status === 'in-progress' && <Clock className="w-5 h-5 text-secondary" />}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Leaderboard */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  Family Leaderboard
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "Sarah", points: 1450, avatar: "S", rank: 1 },
                    { name: "You", points: 1250, avatar: "Y", rank: 2 },
                    { name: "Mike", points: 980, avatar: "M", rank: 3 }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        user.rank === 1 ? 'bg-secondary text-secondary-foreground' :
                        user.rank === 2 ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {user.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.points} points</p>
                      </div>
                      {user.rank === 1 && <Trophy className="w-4 h-4 text-secondary" />}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Rewards */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-secondary" />
                  Available Rewards
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                    <p className="font-medium text-sm">Choose dinner tonight</p>
                    <p className="text-xs text-muted-foreground">Cost: 200 points</p>
                    <Button variant="reward" size="sm" className="w-full mt-2">
                      Claim Reward
                    </Button>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium text-sm">Movie night pick</p>
                    <p className="text-xs text-muted-foreground">Cost: 500 points</p>
                    <div className="mt-2">
                      <Progress value={40} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">300 more points needed</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;