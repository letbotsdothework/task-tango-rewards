import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Plus, Clock, User, Coins, History, Trophy, Star } from 'lucide-react';
import { format } from 'date-fns';

interface RewardsSystemProps {
  userId: string;
  householdId: string;
  userPoints: number;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface RewardClaim {
  id: string;
  reward_id: string;
  claimed_by: string;
  claimed_at: string;
  points_spent: number;
  rewards: {
    title: string;
    description: string;
  };
  profiles: {
    display_name: string;
  };
}

const rewardIcons = ['🎁', '🍕', '🎬', '🎮', '📚', '☕', '🍰', '🎵', '🏆', '⭐'];

export const RewardsSystem = ({ userId, householdId, userPoints }: RewardsSystemProps) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardClaims, setRewardClaims] = useState<RewardClaim[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create reward form
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDescription, setNewRewardDescription] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(50);
  const [selectedIcon, setSelectedIcon] = useState('🎁');
  const [isCreating, setIsCreating] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (householdId) {
      fetchRewards();
      fetchRewardClaims();
    }
  }, [householdId]);

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('points_cost');

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRewardClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_claims')
        .select(`
          *,
          rewards(title, description),
          profiles(display_name)
        `)
        .order('claimed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRewardClaims(data || []);
    } catch (error) {
      console.error('Error fetching reward claims:', error);
    }
  };

  const createReward = async () => {
    if (!newRewardTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reward title.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const { error } = await supabase
        .from('rewards')
        .insert([{
          household_id: householdId,
          title: newRewardTitle.trim(),
          description: newRewardDescription.trim() || null,
          points_cost: newRewardCost,
          created_by: userId
        }]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Reward "${newRewardTitle}" has been created.`,
      });

      setNewRewardTitle('');
      setNewRewardDescription('');
      setNewRewardCost(50);
      setSelectedIcon('🎁');
      setIsCreateDialogOpen(false);
      fetchRewards();
    } catch (error: any) {
      console.error('Error creating reward:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create reward.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const claimReward = async (reward: Reward) => {
    if (userPoints < reward.points_cost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.points_cost} points but only have ${userPoints}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Start transaction by claiming the reward
      const { error: claimError } = await supabase
        .from('reward_claims')
        .insert([{
          reward_id: reward.id,
          claimed_by: userId,
          points_spent: reward.points_cost
        }]);

      if (claimError) throw claimError;

      // Update user points
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ 
          total_points: userPoints - reward.points_cost 
        })
        .eq('user_id', userId);

      if (pointsError) throw pointsError;

      toast({
        title: "Reward Claimed!",
        description: `You've successfully claimed "${reward.title}" for ${reward.points_cost} points.`,
      });

      fetchRewardClaims();
      // The parent component should refetch user points
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Loading Rewards...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Rewards System
          </h2>
          <p className="text-muted-foreground">
            Tausche deine Punkte gegen Belohnungen ein
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Coins className="w-4 h-4 mr-2" />
            {userPoints} Punkte
          </Badge>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Neue Belohnung
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Belohnung erstellen</DialogTitle>
                <DialogDescription>
                  Erstelle eine neue Belohnung für dein Household.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="reward-title">Titel *</Label>
                  <Input
                    id="reward-title"
                    placeholder="z.B. Film aussuchen, Pizza bestellen..."
                    value={newRewardTitle}
                    onChange={(e) => setNewRewardTitle(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reward-description">Beschreibung</Label>
                  <Textarea
                    id="reward-description"
                    placeholder="Weitere Details zur Belohnung..."
                    value={newRewardDescription}
                    onChange={(e) => setNewRewardDescription(e.target.value)}
                    disabled={isCreating}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reward-cost">Kosten (Punkte)</Label>
                  <Input
                    id="reward-cost"
                    type="number"
                    min="1"
                    max="1000"
                    value={newRewardCost}
                    onChange={(e) => setNewRewardCost(parseInt(e.target.value) || 50)}
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-1">
                    {rewardIcons.map((icon) => (
                      <Button
                        key={icon}
                        variant={selectedIcon === icon ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedIcon(icon)}
                        disabled={isCreating}
                        className="w-10 h-10 p-0"
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Abbrechen
                </Button>
                <Button onClick={createReward} disabled={isCreating}>
                  Belohnung erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Verfügbare Belohnungen
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Einlöse-Historie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Noch keine Belohnungen</h3>
                <p className="text-muted-foreground">
                  Erstelle die erste Belohnung für dein Household!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <Card key={reward.id} className="hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        🎁 {reward.title}
                      </span>
                      <Badge variant="secondary">
                        {reward.points_cost} Punkte
                      </Badge>
                    </CardTitle>
                    {reward.description && (
                      <CardDescription>{reward.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      onClick={() => claimReward(reward)}
                      disabled={userPoints < reward.points_cost}
                      className="w-full"
                      variant={userPoints >= reward.points_cost ? "default" : "outline"}
                    >
                      {userPoints >= reward.points_cost ? (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Einlösen
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Nicht genug Punkte
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {rewardClaims.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Noch keine Einlösungen</h3>
                <p className="text-muted-foreground">
                  Hier siehst du alle eingelösten Belohnungen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rewardClaims.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                          🎁
                        </div>
                        <div>
                          <h4 className="font-medium">{claim.rewards.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            {claim.profiles.display_name}
                            <Clock className="w-3 h-3 ml-2" />
                            {format(new Date(claim.claimed_at), 'dd.MM.yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        -{claim.points_spent} Punkte
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};