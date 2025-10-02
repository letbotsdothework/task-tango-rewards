import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, User, Calendar, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  is_challenge: boolean;
  bonus_points: number;
  challenge_deadline: string | null;
  assignee?: {
    display_name: string;
  };
}

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  userRole: 'admin' | 'moderator' | 'member';
  onTaskUpdate: () => void;
}

export const TaskCard = ({ task, currentUserId, userRole, onTaskUpdate }: TaskCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'overdue': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const canCompleteTask = () => {
    return task.status !== 'completed' && 
           (task.assigned_to === currentUserId || task.assigned_to === null);
  };

  const canDeleteTask = () => {
    return userRole === 'admin' || userRole === 'moderator';
  };

  const handleCompleteTask = async () => {
    if (!canCompleteTask()) return;
    
    setIsCompleting(true);
    
    try {
      const { data: currentTask, error: checkError } = await supabase
        .from('tasks')
        .select('status, completed_at')
        .eq('id', task.id)
        .single();

      if (checkError) throw checkError;

      if (currentTask.status === 'completed') {
        toast({
          title: "Aufgabe bereits erledigt",
          description: "Diese Aufgabe wurde bereits abgeschlossen.",
          variant: "destructive",
        });
        onTaskUpdate();
        return;
      }

      const completedAt = new Date().toISOString();
      
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: completedAt,
          assigned_to: task.assigned_to || currentUserId
        })
        .eq('id', task.id)
        .eq('status', 'pending');

      if (taskError) throw taskError;

      let totalPoints = task.points;
      let bonusMessage = '';
      
      if (task.is_challenge && task.challenge_deadline && task.bonus_points > 0) {
        const deadline = new Date(task.challenge_deadline);
        const completed = new Date(completedAt);
        
        if (completed <= deadline) {
          totalPoints += task.bonus_points;
          bonusMessage = ` + ${task.bonus_points} Bonuspunkte für das rechtzeitige Abschließen!`;
        }
      }

      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', currentUserId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          total_points: currentProfile.total_points + totalPoints 
        })
        .eq('id', currentUserId);
      
      if (updateError) throw updateError;

      toast({
        title: "Aufgabe erledigt! 🎉",
        description: `Du hast ${totalPoints} Punkte für "${task.title}" erhalten${bonusMessage}`,
      });

      onTaskUpdate();
      
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        title: "Fehler",
        description: error.message || "Aufgabe konnte nicht abgeschlossen werden.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Aufgabe gelöscht",
        description: `"${task.title}" wurde erfolgreich gelöscht.`,
      });

      onTaskUpdate();
      
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: "Fehler",
        description: error.message || "Aufgabe konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      task.status === 'completed' && "opacity-75 bg-muted/20",
      isOverdue && "border-destructive"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "font-medium",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              <Badge className={getPriorityColor(task.priority)} variant="secondary">
                {task.priority}
              </Badge>
              <Badge className={getStatusColor(task.status)} variant="secondary">
                {task.status}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive">
                  Überfällig
                </Badge>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.assignee && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{task.assignee.display_name}</span>
                </div>
              )}
              {!task.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Gruppenaufgabe</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Fällig: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {task.completed_at && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span>Erledigt: {new Date(task.completed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="font-bold text-primary text-lg">
                {task.points} pts
              </div>
            </div>
            
            <div className="flex gap-2">
              {canCompleteTask() && (
                <Button
                  size="sm"
                  onClick={handleCompleteTask}
                  disabled={isCompleting}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Wird erledigt...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Erledigen
                    </>
                  )}
                </Button>
              )}
              
              {task.status === 'completed' && (
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Erledigt
                </Badge>
              )}

              {canDeleteTask() && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Möchtest du "{task.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask}>
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};