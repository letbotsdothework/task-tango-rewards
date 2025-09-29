import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  display_name: string;
  total_points: number;
  avatar_url: string | null;
  completed_tasks_count: number;
  rank: number;
}

interface LeaderboardProps {
  householdId: string;
  currentUserId: string;
}

export const Leaderboard = ({ householdId, currentUserId }: LeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    
    // Set up real-time subscription for profile updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `household_id=eq.${householdId}`
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  const fetchLeaderboard = async () => {
    try {
      // Get all household members with their points and completed task counts
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, total_points, avatar_url')
        .eq('household_id', householdId)
        .order('total_points', { ascending: false });

      if (profilesError) throw profilesError;

      // Get completed task counts for each user
      const leaderboardData = await Promise.all(
        (profiles || []).map(async (profile, index) => {
          const { count } = await supabase
            .from('tasks')
            .select('id', { count: 'exact' })
            .eq('household_id', householdId)
            .eq('assigned_to', profile.id)
            .eq('status', 'completed');

          return {
            ...profile,
            completed_tasks_count: count || 0,
            rank: index + 1
          };
        })
      );

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold text-sm">{rank}</div>;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            Household Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-secondary" />
          Household Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                user.id === currentUserId && "bg-primary/10 border border-primary/20",
                user.rank <= 3 && "bg-muted/50"
              )}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className={cn(
                  "text-sm font-semibold",
                  user.rank <= 3 && getRankBadge(user.rank)
                )}>
                  {user.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-medium truncate",
                    user.id === currentUserId && "text-primary"
                  )}>
                    {user.display_name}
                    {user.id === currentUserId && " (You)"}
                  </p>
                  {user.rank === 1 && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs">
                      Leader
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>{user.completed_tasks_count} tasks completed</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className={cn(
                  "font-bold text-lg",
                  user.rank === 1 && "text-yellow-600",
                  user.rank === 2 && "text-gray-500",
                  user.rank === 3 && "text-amber-600",
                  user.id === currentUserId && "text-primary"
                )}>
                  {user.total_points}
                </div>
                <div className="text-xs text-muted-foreground">
                  points
                </div>
              </div>
            </div>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No members yet in this household</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};