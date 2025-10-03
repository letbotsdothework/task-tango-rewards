import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trophy, Target, Clock, LogOut, Users, Home, Gift, BarChart3, Shield, CheckCircle } from 'lucide-react';
import { CreateHouseholdDialog } from '@/components/CreateHouseholdDialog';
import { JoinHouseholdDialog } from '@/components/JoinHouseholdDialog';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { TaskCard } from '@/components/TaskCard';
import { Leaderboard } from '@/components/Leaderboard';
import { RewardsSystem } from '@/components/RewardsSystem';
import { AdminPanel } from '@/components/AdminPanel';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';

interface Profile {
  id: string;
  display_name: string;
  total_points: number;
  household_id: string | null;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  points: number;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  completed_at: string | null;
  assignment_type: 'individual' | 'group' | 'rotation';
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_private: boolean;
  icon: string | null;
  color: string | null;
  image_url: string | null;
  notes: string | null;
  is_challenge: boolean;
  bonus_points: number;
  challenge_deadline: string | null;
  assignee?: {
    display_name: string;
  };
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [completedDaysFilter, setCompletedDaysFilter] = useState(7);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.household_id) {
      fetchTasks();
      
      // Set up real-time subscription for tasks
      const channel = supabase
        .channel('dashboard-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `household_id=eq.${profile.household_id}`
          },
          () => {
            fetchTasks();
            fetchProfile(); // Refresh profile to get updated points
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `household_id=eq.${profile.household_id}`
          },
          () => {
            fetchProfile();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.household_id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    }
  };

  const fetchTasks = async () => {
    try {
      if (!profile?.household_id) {
        setLoadingData(false);
        return;
      }

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assignee names for tasks that have assigned_to
      const taskIds = tasksData?.filter(task => task.assigned_to).map(task => task.assigned_to) || [];
      const uniqueAssigneeIds = [...new Set(taskIds)];
      
      let assigneeNames: { [key: string]: string } = {};
      if (uniqueAssigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', uniqueAssigneeIds);
        
        profiles?.forEach(profile => {
          assigneeNames[profile.id] = profile.display_name;
        });
      }

      // Combine tasks with assignee names
      const tasksWithAssignees = tasksData?.map(task => ({
        ...task,
        assignment_type: task.assignment_type as 'individual' | 'group' | 'rotation',
        assignee: task.assigned_to ? { display_name: assigneeNames[task.assigned_to] || 'Unknown' } : undefined
      })) || [];

      setTasks(tasksWithAssignees);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/');
    }
  };

  const handleHouseholdSuccess = () => {
    fetchProfile();
    fetchTasks();
  };

  const getActiveTasks = () => {
    return tasks.filter(t => t.status !== 'completed');
  };

  const getCompletedTasksInRange = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - completedDaysFilter);
    return tasks.filter(t => 
      t.status === 'completed' && 
      t.completed_at && 
      new Date(t.completed_at) >= cutoffDate
    );
  };

  const getPendingTasksCount = () => {
    return tasks.filter(t => t.status === 'pending').length;
  };

  const getCompletedTasksCount = () => {
    return getCompletedTasksInRange().length;
  };

  const getUserTasksCount = () => {
    return tasks.filter(t => t.assigned_to === profile?.id && t.status !== 'completed').length;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">TaskTango</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.display_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-gradient-secondary">
              <Trophy className="w-4 h-4 mr-2" />
              {profile?.total_points || 0} Punkte
            </Badge>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!profile?.household_id ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join or Create a Household</CardTitle>
              <CardDescription>
                Get started by joining an existing household or creating your own to begin organizing tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-gradient-primary"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Household
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowJoinDialog(true)}
                >
                  Join Household
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Übersicht
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Belohnungen
              </TabsTrigger>
              {profile.role === 'admin' && (
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              )}
              {profile.role === 'admin' && (
                <TabsTrigger value="subscription" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Subscription
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Time Filter */}
              <div className="flex justify-end items-center gap-4">
                <label className="text-sm text-muted-foreground">Erledigte Aufgaben der letzten:</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((days) => (
                    <Button
                      key={days}
                      variant={completedDaysFilter === days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCompletedDaysFilter(days)}
                    >
                      {days} Tage
                    </Button>
                  ))}
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="hover:shadow-medium transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Aktive Aufgaben</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getActiveTasks().length}</div>
                    <p className="text-xs text-muted-foreground">Zu erledigen</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-medium transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Offene Aufgaben</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getPendingTasksCount()}</div>
                    <p className="text-xs text-muted-foreground">Warten auf Erledigung</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-medium transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Erledigte Aufgaben</CardTitle>
                    <Trophy className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getCompletedTasksCount()}</div>
                    <p className="text-xs text-muted-foreground">Bereits abgeschlossen</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-medium transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deine Aufgaben</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getUserTasksCount()}</div>
                    <p className="text-xs text-muted-foreground">Dir zugewiesen</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tasks Section */}
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Aktive Aufgaben</CardTitle>
                          <CardDescription>Alle offenen Aufgaben des Haushalts</CardDescription>
                        </div>
                        {(profile.role === 'admin' || profile.role === 'moderator') && (
                          <Button onClick={() => setShowCreateTaskDialog(true)} className="bg-gradient-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Aufgabe hinzufügen
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {getActiveTasks().length === 0 ? (
                        <div className="text-center py-8">
                          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">Keine aktiven Aufgaben</h3>
                          <p className="text-muted-foreground mb-4">
                            {profile.role === 'admin' || profile.role === 'moderator' 
                              ? 'Erstelle eine neue Aufgabe um zu beginnen!' 
                              : 'Es gibt noch keine Aufgaben. Ein Admin oder Moderator kann welche erstellen.'}
                          </p>
                          {(profile.role === 'admin' || profile.role === 'moderator') && (
                            <Button onClick={() => setShowCreateTaskDialog(true)} className="bg-gradient-primary">
                              <Plus className="w-4 h-4 mr-2" />
                              Erste Aufgabe erstellen
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getActiveTasks().map((task) => (
                            <div
                              key={task.id}
                              className={task.assigned_to === profile.id ? 'ring-2 ring-primary/20 rounded-lg' : ''}
                            >
                              <TaskCard
                                task={task}
                                currentUserId={profile.id}
                                userRole={profile.role as 'admin' | 'moderator' | 'member'}
                                onTaskUpdate={handleHouseholdSuccess}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Completed Tasks Section */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Erledigte Aufgaben</CardTitle>
                      <CardDescription>
                        Abgeschlossene Aufgaben der letzten {completedDaysFilter} Tage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {getCompletedTasksInRange().length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                          <p className="text-muted-foreground">
                            Keine erledigten Aufgaben in diesem Zeitraum
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {getCompletedTasksInRange().map((task) => (
                            <div
                              key={task.id}
                              className={task.assigned_to === profile.id ? 'ring-2 ring-primary/20 rounded-lg' : ''}
                            >
                              <TaskCard
                                task={task}
                                currentUserId={profile.id}
                                userRole={profile.role as 'admin' | 'moderator' | 'member'}
                                onTaskUpdate={handleHouseholdSuccess}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <Leaderboard 
                    householdId={profile.household_id}
                    currentUserId={profile.id}
                  />

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Deine Statistiken
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Gesamte Punkte</span>
                        <Badge variant="secondary" className="bg-gradient-primary text-white">
                          {profile.total_points}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Erledigte Aufgaben</span>
                        <span className="font-bold">{tasks.filter(t => t.status === 'completed' && t.assigned_to === profile.id).length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Zugewiesene Aufgaben</span>
                        <span className="font-bold">{getUserTasksCount()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rewards">
              <RewardsSystem 
                userId={profile.id} 
                householdId={profile.household_id} 
                userPoints={profile.total_points}
                onPointsChange={fetchProfile}
              />
            </TabsContent>

            {profile.role === 'admin' && (
              <TabsContent value="admin">
                <AdminPanel 
                  userId={profile.id} 
                  householdId={profile.household_id} 
                  userRole={profile.role}
                  onPointsChange={fetchProfile}
                />
              </TabsContent>
            )}

            <TabsContent value="subscription">
              <SubscriptionManagement 
                householdId={profile.household_id!} 
                userRole={profile.role}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Household Dialogs */}
      {user && (
        <>
          <CreateHouseholdDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={handleHouseholdSuccess}
            userId={user.id}
          />
          <JoinHouseholdDialog
            open={showJoinDialog}
            onOpenChange={setShowJoinDialog}
            onSuccess={handleHouseholdSuccess}
            userId={user.id}
          />
          {profile?.household_id && (
            <CreateTaskDialog
              open={showCreateTaskDialog}
              onOpenChange={setShowCreateTaskDialog}
              onSuccess={handleHouseholdSuccess}
              userId={profile.id}
              householdId={profile.household_id}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;