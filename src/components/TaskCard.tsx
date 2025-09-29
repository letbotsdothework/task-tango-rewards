import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, User, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  assignee?: {
    display_name: string;
  };
}

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onTaskUpdate: () => void;
}

export const TaskCard = ({ task, currentUserId, onTaskUpdate }: TaskCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
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
    // User can complete if:
    // 1. Task is not already completed
    // 2. Task is assigned to them OR task is unassigned (group task)
    return task.status !== 'completed' && 
           (task.assigned_to === currentUserId || task.assigned_to === null);
  };

  const handleCompleteTask = async () => {
    if (!canCompleteTask()) return;
    
    setIsCompleting(true);
    
    try {
      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          // If it's a group task (unassigned), assign it to the current user who completed it
          assigned_to: task.assigned_to || currentUserId
        })
        .eq('id', task.id);

      if (taskError) throw taskError;

      // Award points to the user
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', currentUserId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          total_points: currentProfile.total_points + task.points 
        })
        .eq('id', currentUserId);
      
      if (updateError) throw updateError;

      toast({
        title: "Task completed! 🎉",
        description: `You earned ${task.points} points for completing "${task.title}"`,
      });

      onTaskUpdate();
      
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete task.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
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
            {/* Title and Status */}
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
                  Overdue
                </Badge>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}

            {/* Meta Information */}
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
                  <span>Group Task</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {task.completed_at && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Points and Action */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="font-bold text-primary text-lg">
                {task.points} pts
              </div>
            </div>
            
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
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </>
                )}
              </Button>
            )}
            
            {task.status === 'completed' && (
              <Badge variant="outline" className="text-success border-success">
                <CheckCircle className="w-3 h-3 mr-1" />
                Done
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};