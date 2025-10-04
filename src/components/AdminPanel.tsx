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
import { Shield, Edit, Save, X, Users, Award, BarChart3, Settings, Mail, UserPlus, Clock, CheckCircle, AlertCircle, Crown, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MysteryWheelConfig } from './MysteryWheelConfig';

interface AdminPanelProps {
  userId: string;
  householdId: string;
  userRole: string;
  onPointsChange?: () => void;
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
  role: 'admin' | 'moderator' | 'member';
}

interface HouseholdInvite {
  id: string;
  invited_email: string;
  expires_at: string;
  is_accepted: boolean;
  created_at: string;
  accepted_at: string | null;
  invited_role: 'admin' | 'moderator' | 'member';
}

export const AdminPanel = ({ userId, householdId, userRole, onPointsChange }: AdminPanelProps) => {
  const [tasks, setTasks] = useState<TaskEdit[]>([]);
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPoints, setTempPoints] = useState<{ [key: string]: number }>({});
  
  // Invite form state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviterName, setInviterName] = useState('');
  
  const { toast } = useToast();

  // Only show admin panel if user is admin
  if (userRole !== 'admin') {
    return null;
  }

  useEffect(() => {
    if (householdId) {
      fetchTasks();
      fetchUsers();
      fetchInvites();
      fetchHouseholdInfo();
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
        .select('id, display_name, total_points, user_id, role')
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

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('household_invites')
        .select('id, invited_email, expires_at, is_accepted, created_at, accepted_at, invited_role')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const fetchHouseholdInfo = async () => {
    try {
      // Get household name and current user's name
      const [householdResult, profileResult] = await Promise.all([
        supabase.from('households').select('name').eq('id', householdId).single(),
        supabase.from('profiles').select('display_name').eq('id', userId).single()
      ]);

      if (householdResult.data?.name) {
        setHouseholdName(householdResult.data.name);
      }
      if (profileResult.data?.display_name) {
        setInviterName(profileResult.data.display_name);
      }
    } catch (error) {
      console.error('Error fetching household info:', error);
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
      // Notify parent component to refresh points
      if (onPointsChange) {
        onPointsChange();
      }
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

  const updateUserRole = async (profileId: string, newRole: 'admin' | 'moderator' | 'member') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Rolle aktualisiert!",
        description: "Die Benutzerrolle wurde erfolgreich geändert.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren der Rolle.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Administrator', icon: Crown, color: 'bg-gradient-primary text-white' },
      moderator: { label: 'Moderator', icon: UserCog, color: 'bg-gradient-secondary text-white' },
      member: { label: 'Mitglied', icon: Users, color: 'bg-muted text-muted-foreground' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: 'Kann alles verwalten: Mitglieder, Aufgaben, Belohnungen, Einstellungen',
      moderator: 'Kann Aufgaben und Kategorien erstellen und bearbeiten',
      member: 'Kann Aufgaben abschließen und Belohnungen beanspruchen'
    };
    return descriptions[role as keyof typeof descriptions] || descriptions.member;
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('household_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: "Einladung gelöscht",
        description: "Die Einladung wurde erfolgreich zurückgezogen.",
      });

      fetchInvites();
    } catch (error: any) {
      console.error('Error deleting invite:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen der Einladung.",
        variant: "destructive",
      });
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib eine E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }

    if (!householdName || !inviterName) {
      toast({
        title: "Fehler", 
        description: "Haushaltsinformationen nicht verfügbar.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      // Get current user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht authentifiziert');
      }

      const { data, error } = await supabase.functions.invoke('send-household-invite', {
        body: {
          householdId,
          invitedEmail: inviteEmail.trim(),
          householdName,
          inviterName,
          invitedRole: inviteRole,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;

      toast({
        title: "Einladung versendet! 📧",
        description: `Einladung an ${inviteEmail} wurde erfolgreich versendet.`,
      });

      setInviteEmail('');
      setInviteRole('member');
      setIsInviteDialogOpen(false);
      fetchInvites(); // Refresh invites list
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Versenden der Einladung.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
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
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Admin Panel
            </h2>
            <p className="text-muted-foreground">
              Verwalte Punkte, Aufgaben und Rollen für dein Household
            </p>
          </div>
          <Badge variant="secondary" className="bg-gradient-primary text-white">
            Administrator
          </Badge>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Aufgaben-Punkte
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzer-Punkte
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Einladungen
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
                Passe die Punktewerte für bestehende Aufgaben an. Nur Admins und Moderatoren können Aufgaben bearbeiten.
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => updateTaskPoints(task.id, tempPoints[task.id] || task.current_points)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Punktewert speichern</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Bearbeitung abbrechen</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            {task.current_points} Punkte
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingTask(task.id, task.current_points)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Punktewert bearbeiten</p>
                            </TooltipContent>
                          </Tooltip>
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
              <CardTitle>Benutzer- & Rollenverwaltung</CardTitle>
              <CardDescription>
                Verwalte Punkte und Rollen der Haushaltsmitglieder. Verschiedene Rollen haben unterschiedliche Befugnisse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => updateUserPoints(user.id, tempPoints[user.id] || user.total_points)}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Punkte speichern</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Abbrechen</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-lg px-3 py-1">
                              {user.total_points} Punkte
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditingUser(user.id, user.total_points)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Punkte bearbeiten</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rolle:</span>
                        {getRoleBadge(user.role)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{getRoleDescription(user.role)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {user.user_id !== userId && (
                        <Select
                          value={user.role}
                          onValueChange={(value: 'admin' | 'moderator' | 'member') => updateUserRole(user.id, value)}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Rolle wählen" />
                              </SelectTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Rolle des Mitglieds ändern</p>
                            </TooltipContent>
                          </Tooltip>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4" />
                                Administrator
                              </div>
                            </SelectItem>
                            <SelectItem value="moderator">
                              <div className="flex items-center gap-2">
                                <UserCog className="w-4 h-4" />
                                Moderator
                              </div>
                            </SelectItem>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Mitglied
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {user.user_id === userId && (
                        <span className="text-sm text-muted-foreground italic">
                          (Du selbst - Rolle kann nicht geändert werden)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Haushalt-Einladungen</span>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-secondary">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Neue Einladung
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Neue Mitglieder per E-Mail einladen</p>
                    </TooltipContent>
                  </Tooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mitbewohner einladen</DialogTitle>
                      <DialogDescription>
                        Lade neue Mitglieder zu deinem Haushalt "{householdName}" ein.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="invite-email">E-Mail-Adresse *</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="name@beispiel.de"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          disabled={isInviting}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="invite-role">Rolle *</Label>
                        <Select value={inviteRole} onValueChange={(value: 'admin' | 'moderator' | 'member') => setInviteRole(value)}>
                          <SelectTrigger id="invite-role">
                            <SelectValue placeholder="Rolle wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">Mitglied</div>
                                  <div className="text-xs text-muted-foreground">Kann Aufgaben abschließen und Belohnungen beanspruchen</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="moderator">
                              <div className="flex items-center gap-2">
                                <UserCog className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">Moderator</div>
                                  <div className="text-xs text-muted-foreground">Kann Aufgaben und Kategorien erstellen und bearbeiten</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">Administrator</div>
                                  <div className="text-xs text-muted-foreground">Kann alles verwalten</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsInviteDialogOpen(false)}
                        disabled={isInviting}
                      >
                        Abbrechen
                      </Button>
                      <Button onClick={sendInvite} disabled={isInviting}>
                        {isInviting ? (
                          "Versende..."
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Einladung senden
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Verwalte ausstehende und akzeptierte Einladungen für dein Household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        invite.is_accepted 
                          ? 'bg-green-100 text-green-600'
                          : new Date(invite.expires_at) < new Date()
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {invite.is_accepted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : new Date(invite.expires_at) < new Date() ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{invite.invited_email}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {invite.is_accepted
                              ? `Akzeptiert am ${format(new Date(invite.accepted_at!), 'dd.MM.yyyy HH:mm')}`
                              : new Date(invite.expires_at) < new Date()
                              ? `Abgelaufen am ${format(new Date(invite.expires_at), 'dd.MM.yyyy')}`
                              : `Läuft ab am ${format(new Date(invite.expires_at), 'dd.MM.yyyy')}`
                            }
                          </p>
                          <span className="text-muted-foreground">•</span>
                          {getRoleBadge(invite.invited_role)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        invite.is_accepted 
                          ? "default"
                          : new Date(invite.expires_at) < new Date()
                          ? "destructive"
                          : "secondary"
                      }>
                        {invite.is_accepted
                          ? "Akzeptiert"
                          : new Date(invite.expires_at) < new Date()
                          ? "Abgelaufen"
                          : "Ausstehend"
                        }
                      </Badge>
                      {!invite.is_accepted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteInvite(invite.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Einladung zurückziehen</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
                
                {invites.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Noch keine Einladungen versendet.</p>
                    <p className="text-sm">Lade neue Mitglieder zu deinem Haushalt ein!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <MysteryWheelConfig householdId={householdId} />
          
          <Card>
            <CardHeader>
              <CardTitle>Household-Statistiken</CardTitle>
              <CardDescription>
                Übersicht über dein Household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-muted/50">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
};