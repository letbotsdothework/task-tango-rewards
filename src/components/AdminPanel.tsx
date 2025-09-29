import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Edit, Save, X, Users, Award, BarChart3, Settings } from 'lucide-react';

interface AdminPanelProps {
  userId: string;
  householdId: string;
  userRole: string;
}

interface TaskEdit {
  id: string;
  title: string;
  current_points: number;
  new_points: number;
  assignee_name: string;
}

interface UserPoints {
  id: string;
  display_name: string;
  total_points: number;
  user_id: string;
}

export const AdminPanel = ({ userId, householdId, userRole }: AdminPanelProps) => {
  const [tasks, setTasks] = useState<TaskEdit[]>([]);
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPoints, setTempPoints] = useState<{ [key: string]: number }>({});
  
  const { toast } = useToast();

  // Only show admin panel if user is admin
  if (userRole !== 'admin') {
    return null;
  }

  useEffect(() => {
    if (householdId) {
      fetchTasks();
      fetchUsers();
    }
  }, [householdId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          points,
          assigned_to,
          profiles!tasks_assigned_to_fkey(display_name)
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tasksWithAssignee = data.map(task => ({
        id: task.id,
        title: task.title,
        current_points: task.points,
        new_points: task.points,
        assignee_name: task.profiles?.display_name || 'Unassigned'
      }));
      
      setTasks(tasksWithAssignee);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, total_points, user_id')
        .eq('household_id', householdId)
        .order('total_points', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskPoints = async (taskId: string, newPoints: number) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ points: newPoints })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Task points updated successfully.",
      });

      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error('Error updating task points:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task points.",
        variant: "destructive",
      });
    }
  };

  const updateUserPoints = async (profileId: string, newPoints: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ total_points: newPoints })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "User points updated successfully.",
      });

      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user points:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user points.",
        variant: "destructive",
      });
    }
  };

  const startEditingTask = (taskId: string, currentPoints: number) => {
    setEditingTask(taskId);
    setTempPoints(prev => ({ ...prev, [taskId]: currentPoints }));
  };

  const startEditingUser = (userId: string, currentPoints: number) => {
    setEditingUser(userId);
    setTempPoints(prev => ({ ...prev, [userId]: currentPoints }));
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditingUser(null);
    setTempPoints({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Panel
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
            <Shield className="w-6 h-6" />
            Admin Panel
          </h2>
          <p className="text-muted-foreground">
            Verwalte Punkte und Aufgaben für dein Household
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-primary text-white">
          Administrator
        </Badge>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Aufgaben-Punkte
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzer-Punkte
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aufgaben-Punktewerte bearbeiten</CardTitle>
              <CardDescription>
                Passe die Punktewerte für bestehende Aufgaben an.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Zugewiesen an: {task.assignee_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingTask === task.id ? (
                        <>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={tempPoints[task.id] || task.current_points}
                            onChange={(e) => setTempPoints(prev => ({
                              ...prev,
                              [task.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-20"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateTaskPoints(task.id, tempPoints[task.id] || task.current_points)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            {task.current_points} Punkte
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingTask(task.id, task.current_points)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Noch keine Aufgaben vorhanden.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benutzer-Punkte verwalten</CardTitle>
              <CardDescription>
                Korrigiere oder passe die Punktestände der Benutzer an.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{user.display_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Benutzer-ID: {user.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingUser === user.id ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max="10000"
                            value={tempPoints[user.id] || user.total_points}
                            onChange={(e) => setTempPoints(prev => ({
                              ...prev,
                              [user.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateUserPoints(user.id, tempPoints[user.id] || user.total_points)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {user.total_points} Punkte
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingUser(user.id, user.total_points)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household-Einstellungen</CardTitle>
              <CardDescription>
                Weitere Verwaltungsoptionen für dein Household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Statistiken</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gesamte Aufgaben:</span>
                      <span className="ml-2 font-medium">{tasks.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Household-Mitglieder:</span>
                      <span className="ml-2 font-medium">{users.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gesamte Punkte:</span>
                      <span className="ml-2 font-medium">
                        {users.reduce((sum, user) => sum + user.total_points, 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  Weitere Admin-Funktionen werden in zukünftigen Updates hinzugefügt.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};