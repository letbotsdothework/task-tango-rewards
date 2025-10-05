import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CustomReward {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  probability: number;
}

interface MysteryWheelConfigProps {
  householdId: string;
}

export const MysteryWheelConfig = ({ householdId }: MysteryWheelConfigProps) => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [probabilities, setProbabilities] = useState({
    double_points: 30,
    avatars: 25,
    custom: 20,
    points: 25
  });
  const [customRewards, setCustomRewards] = useState<CustomReward[]>([]);
  const [newReward, setNewReward] = useState({ name: '', description: '', icon: '🎁', probability: 5 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadCustomRewards();
  }, [householdId]);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from('mystery_reward_configs')
      .select('*')
      .eq('household_id', householdId)
      .maybeSingle();

    if (data) {
      setEnabled(data.enabled);
      setDailyLimit(data.daily_limit);
      setProbabilities(data.probabilities as any);
    }
  };

  const loadCustomRewards = async () => {
    const { data, error } = await supabase
      .from('mystery_custom_rewards')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (data) {
      setCustomRewards(data);
    }
  };

  const saveConfig = async () => {
    // Validate total probability
    const customTotal = customRewards.reduce((sum, r) => sum + r.probability, 0);
    const total = probabilities.double_points + probabilities.avatars + customTotal + probabilities.points;
    
    if (Math.abs(total - 100) > 0.01) {
      toast({
        title: "Validierungsfehler",
        description: `Die Gesamtwahrscheinlichkeit beträgt ${total.toFixed(1)}% statt 100%`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: currentUser } = await supabase.auth.getUser();
    
    // Update config with base probabilities (custom probability is sum of all custom rewards)
    const { error } = await supabase
      .from('mystery_reward_configs')
      .upsert({
        household_id: householdId,
        enabled,
        daily_limit: dailyLimit,
        probabilities: {
          ...probabilities,
          custom: customTotal
        }
      });

    if (error) {
      console.error('Config save error:', error);
      toast({
        title: "Fehler",
        description: `Konfiguration konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Gespeichert",
        description: "Mystery Wheel Einstellungen wurden aktualisiert.",
      });
    }
    setLoading(false);
  };

  const addCustomReward = async () => {
    if (!newReward.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen ein.",
        variant: "destructive",
      });
      return;
    }

    const { data: currentUser } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('mystery_custom_rewards')
      .insert({
        household_id: householdId,
        name: newReward.name,
        description: newReward.description || null,
        icon: newReward.icon,
        probability: newReward.probability,
        created_by: currentUser.user!.id
      });

    if (error) {
      toast({
        title: "Fehler",
        description: "Belohnung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erstellt",
        description: "Neue Belohnung wurde hinzugefügt.",
      });
      setNewReward({ name: '', description: '', icon: '🎁', probability: 5 });
      setIsDialogOpen(false);
      loadCustomRewards();
    }
  };

  const deleteCustomReward = async (id: string) => {
    const { error } = await supabase
      .from('mystery_custom_rewards')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Belohnung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Gelöscht",
        description: "Belohnung wurde entfernt.",
      });
      loadCustomRewards();
    }
  };

  const updateProbability = (key: string, value: number) => {
    setProbabilities(prev => ({ ...prev, [key]: value }));
  };

  const updateCustomRewardProbability = (id: string, probability: number) => {
    setCustomRewards(prev => 
      prev.map(r => r.id === id ? { ...r, probability } : r)
    );
  };

  const saveCustomRewardProbability = async (id: string, probability: number) => {
    const { error } = await supabase
      .from('mystery_custom_rewards')
      .update({ probability })
      .eq('id', id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Wahrscheinlichkeit konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const customRewardsTotalProb = customRewards.reduce((sum, r) => sum + r.probability, 0);
  const totalProbability = probabilities.double_points + probabilities.avatars + customRewardsTotalProb + probabilities.points;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Mystery Wheel Konfiguration
          </CardTitle>
          <CardDescription>
            Konfiguriere Gewinnmöglichkeiten und Wahrscheinlichkeiten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Mystery Wheel aktiviert</Label>
              <p className="text-sm text-muted-foreground">
                Mystery Rewards für erledigte Aufgaben
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Tägliches Limit</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-base">Gewinnwahrscheinlichkeiten</Label>
              <p className={`text-sm mb-4 ${totalProbability === 100 ? 'text-green-600' : 'text-destructive'}`}>
                Gesamt: {totalProbability.toFixed(1)}% {totalProbability !== 100 && '❌ Muss genau 100% sein!'}
                {totalProbability === 100 && '✓'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>⚡ Doppelte Punkte</Label>
                  <span className="text-sm font-medium">{probabilities.double_points}%</span>
                </div>
                <Slider
                  value={[probabilities.double_points]}
                  onValueChange={([value]) => updateProbability('double_points', value)}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>🦸 Avatar</Label>
                  <span className="text-sm font-medium">{probabilities.avatars}%</span>
                </div>
                <Slider
                  value={[probabilities.avatars]}
                  onValueChange={([value]) => updateProbability('avatars', value)}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>🎁 Eigene Belohnungen (Gesamt)</Label>
                  <span className="text-sm font-medium">{customRewardsTotalProb}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Wird aus allen einzelnen Belohnungen berechnet
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>⭐ Punkte</Label>
                  <span className="text-sm font-medium">{probabilities.points}%</span>
                </div>
                <Slider
                  value={[probabilities.points]}
                  onValueChange={([value]) => updateProbability('points', value)}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={saveConfig} 
            disabled={loading || totalProbability !== 100} 
            className="w-full"
          >
            {totalProbability !== 100 ? 'Gesamtwahrscheinlichkeit muss 100% sein' : 'Einstellungen speichern'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Eigene Belohnungen</CardTitle>
              <CardDescription>Selbst definierte Preise für das Mystery Wheel</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Belohnung erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Input
                      value={newReward.icon}
                      onChange={(e) => setNewReward({ ...newReward, icon: e.target.value })}
                      placeholder="🎁"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newReward.name}
                      onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                      placeholder="z.B. Extra Pause"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Input
                      value={newReward.description}
                      onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                      placeholder="z.B. 15 Minuten zusätzliche Pause"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wahrscheinlichkeit (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newReward.probability}
                      onChange={(e) => setNewReward({ ...newReward, probability: parseInt(e.target.value) || 0 })}
                      placeholder="5"
                    />
                  </div>
                  <Button onClick={addCustomReward} className="w-full">
                    Belohnung erstellen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {customRewards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine eigenen Belohnungen erstellt
              </p>
            ) : (
              customRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{reward.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{reward.name}</p>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={reward.probability}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          updateCustomRewardProbability(reward.id, val);
                        }}
                        onBlur={() => saveCustomRewardProbability(reward.id, reward.probability)}
                        className="w-16 text-center"
                      />
                      <span className="text-sm">%</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomReward(reward.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};