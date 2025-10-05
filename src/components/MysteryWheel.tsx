import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Trophy, Gift, Star, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MysteryWheelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  householdId: string;
  onRewardClaimed?: () => void;
}

interface WheelSegment {
  type: 'double_points' | 'avatar' | 'custom' | 'points';
  startAngle: number;
  endAngle: number;
  color: string;
  icon: string;
  label: string;
  customData?: any;
}

const REWARD_COLORS: Record<string, string> = {
  double_points: '#FFD93D', // Yellow/Gold
  avatar: '#C589E8', // Purple
  custom: '#FF8ED4', // Pink
  points: '#4ECDC4', // Teal
};

const REWARD_ICONS: Record<string, string> = {
  double_points: '⚡',
  avatar: '🦸',
  custom: '🎁',
  points: '⭐',
};

export const MysteryWheel = ({ open, onOpenChange, taskId, householdId, onRewardClaimed }: MysteryWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<any>(null);
  const [showReward, setShowReward] = useState(false);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const { toast } = useToast();

  // Load config to build wheel segments
  useEffect(() => {
    if (open && householdId) {
      loadWheelSegments();
    }
  }, [open, householdId]);

  const loadWheelSegments = async () => {
    try {
      // Get config
      const { data: config } = await supabase
        .from('mystery_reward_configs')
        .select('probabilities')
        .eq('household_id', householdId)
        .maybeSingle();

      // Get custom rewards
      const { data: customRewards } = await supabase
        .from('mystery_custom_rewards')
        .select('*')
        .eq('household_id', householdId);

      const probabilities = config?.probabilities as any || {
        double_points: 30,
        avatars: 25,
        custom: 20,
        points: 25
      };

      const newSegments: WheelSegment[] = [];
      let currentAngle = 0;

      // Add double_points segment
      if (probabilities.double_points > 0) {
        const segmentSize = (probabilities.double_points / 100) * 360;
        newSegments.push({
          type: 'double_points',
          startAngle: currentAngle,
          endAngle: currentAngle + segmentSize,
          color: REWARD_COLORS.double_points,
          icon: REWARD_ICONS.double_points,
          label: 'Doppelte Punkte'
        });
        currentAngle += segmentSize;
      }

      // Add avatars segment
      if (probabilities.avatars > 0) {
        const segmentSize = (probabilities.avatars / 100) * 360;
        newSegments.push({
          type: 'avatar',
          startAngle: currentAngle,
          endAngle: currentAngle + segmentSize,
          color: REWARD_COLORS.avatar,
          icon: REWARD_ICONS.avatar,
          label: 'Avatar'
        });
        currentAngle += segmentSize;
      }

      // Add custom rewards segments
      if (customRewards && customRewards.length > 0) {
        for (const reward of customRewards) {
          const rewardProb = reward.probability || 5;
          if (rewardProb > 0) {
            const segmentSize = (rewardProb / 100) * 360;
            newSegments.push({
              type: 'custom',
              startAngle: currentAngle,
              endAngle: currentAngle + segmentSize,
              color: REWARD_COLORS.custom,
              icon: reward.icon || REWARD_ICONS.custom,
              label: reward.name,
              customData: reward
            });
            currentAngle += segmentSize;
          }
        }
      }

      // Add points segment
      if (probabilities.points > 0) {
        const segmentSize = (probabilities.points / 100) * 360;
        newSegments.push({
          type: 'points',
          startAngle: currentAngle,
          endAngle: currentAngle + segmentSize,
          color: REWARD_COLORS.points,
          icon: REWARD_ICONS.points,
          label: 'Punkte'
        });
        currentAngle += segmentSize;
      }

      setSegments(newSegments);
    } catch (error) {
      console.error('Error loading wheel segments:', error);
    }
  };

  const handleSpin = async () => {
    setIsSpinning(true);
    setShowReward(false);

    try {
      // Get task points for double points calculation
      const { data: taskData } = await supabase
        .from('tasks')
        .select('points')
        .eq('id', taskId)
        .single();

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('spin-mystery-wheel', {
        body: { taskId, householdId, taskPoints: taskData?.points || 10 }
      });

      if (error) {
        throw error;
      }

      // Calculate rotation using targetAngle from server
      // We need to rotate TO the target angle, accounting for pointer at top (0°)
      // The pointer points down when wheel starts, so we need to adjust
      const targetAngle = data.targetAngle || 0;
      const fullRotations = 4 + Math.random(); // 4-5 full spins for drama
      const adjustedTarget = 360 - targetAngle; // Invert because wheel rotates clockwise
      const totalRotation = rotation + (fullRotations * 360) + adjustedTarget;
      
      setRotation(totalRotation);

      // Wait for spin animation to complete
      setTimeout(() => {
        setReward(data);
        setShowReward(true);
        setIsSpinning(false);
        
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Call onRewardClaimed callback
        if (onRewardClaimed) {
          onRewardClaimed();
        }
      }, 3000);

    } catch (error: any) {
      console.error('Spin error:', error);
      toast({
        title: "Fehler",
        description: error.message || "Konnte Glücksrad nicht drehen.",
        variant: "destructive",
      });
      setIsSpinning(false);
    }
  };

  const getRewardIcon = () => {
    if (!reward) return <Gift className="w-16 h-16" />;
    
    switch (reward.rewardType) {
      case 'double_points':
        return <Zap className="w-16 h-16 text-yellow-500" />;
      case 'points':
        return <Star className="w-16 h-16 text-yellow-500" />;
      case 'avatar':
        return <div className="text-6xl">{reward.rewardValue.emoji}</div>;
      case 'custom':
        return <div className="text-6xl">{reward.rewardValue.icon}</div>;
      default:
        return <Gift className="w-16 h-16" />;
    }
  };

  const getRewardTitle = () => {
    if (!reward) return '';
    
    switch (reward.rewardType) {
      case 'double_points':
        return `⚡ Doppelte Punkte! +${reward.rewardValue.points}`;
      case 'points':
        return `+${reward.rewardValue.points} Punkte!`;
      case 'avatar':
        return `${reward.rewardValue.emoji} Neuer Avatar!`;
      case 'custom':
        return `${reward.rewardValue.icon} ${reward.rewardValue.name}`;
      default:
        return 'Belohnung gewonnen!';
    }
  };

  const getRewardDescription = () => {
    if (!reward) return '';
    
    switch (reward.rewardType) {
      case 'double_points':
        return `Du hast die doppelte Punktzahl erhalten! (${reward.rewardValue.original} × 2)`;
      case 'points':
        return 'Deine Punkte wurden automatisch gutgeschrieben!';
      case 'avatar':
        return 'Dein neuer Avatar wird jetzt im Leaderboard angezeigt!';
      case 'custom':
        return reward.rewardValue.description || 'Glückwunsch zu deinem Gewinn!';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AnimatePresence mode="wait">
          {!showReward ? (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6 p-4"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Mystery Belohnung! 🎰
                </h2>
                <p className="text-muted-foreground">
                  Drehe das Rad der Fortuna und gewinne eine Überraschung!
                </p>
              </div>

              {/* The Wheel */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto">
                {/* Wheel SVG */}
                <motion.svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  }}
                >
                  {segments.map((segment, index) => {
                    const startAngle = segment.startAngle;
                    const endAngle = segment.endAngle;
                    const midAngle = (startAngle + endAngle) / 2;
                    
                    // Calculate path for pie slice
                    const startX = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const startY = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const endX = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const endY = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);
                    
                    // Large arc flag if segment is > 180 degrees
                    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
                    
                    return (
                      <g key={index}>
                        <path
                          d={`M 100 100 L ${startX} ${startY} A 90 90 0 ${largeArc} 1 ${endX} ${endY} Z`}
                          fill={segment.color}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        {/* Icon */}
                        <text
                          x={100 + 60 * Math.cos((midAngle - 90) * Math.PI / 180)}
                          y={100 + 60 * Math.sin((midAngle - 90) * Math.PI / 180)}
                          fontSize="24"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {segment.icon}
                        </text>
                      </g>
                    );
                  })}
                  {/* Center circle */}
                  <circle cx="100" cy="100" r="15" fill="#fff" stroke="#333" strokeWidth="2" />
                </motion.svg>

                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary" />
                </div>
              </div>

              {reward && reward.remainingSpins !== undefined && (
                <div className="text-center">
                  <Badge variant="secondary">
                    {reward.remainingSpins} {reward.remainingSpins === 1 ? 'Versuch' : 'Versuche'} heute noch
                  </Badge>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={isSpinning}
                >
                  <X className="w-4 h-4 mr-2" />
                  Später
                </Button>
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="flex-1 bg-gradient-primary"
                >
                  {isSpinning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                      </motion.div>
                      Dreht...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Jetzt drehen!
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="space-y-6 p-4"
            >
              <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                  >
                    {getRewardIcon()}
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">
                      {getRewardTitle()}
                    </h3>
                    <p className="text-muted-foreground">
                      {getRewardDescription()}
                    </p>
                  </div>

                  {reward.remainingSpins !== undefined && (
                    <Badge variant="secondary">
                      {reward.remainingSpins} {reward.remainingSpins === 1 ? 'Versuch' : 'Versuche'} heute noch
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Weiter
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};