import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
  householdId: string;
}

interface HouseholdMember {
  id: string;
  display_name: string;
  user_id: string;
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  onSuccess,
  userId,
  householdId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [points, setPoints] = useState(10);
  const [dueDate, setDueDate] = useState<Date>();
  const [category, setCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const { toast } = useToast();

  const categories = [
    'Küche', 'Bad', 'Wäsche', 'Einkauf', 'Müll', 'Reinigung', 
    'Garten', 'Organisatorisches', 'Sonstiges'
  ];

  const pointValues = [
    { label: '5 Punkte (Kleine Aufgabe)', value: 5 },
    { label: '10 Punkte (Standard)', value: 10 },
    { label: '15 Punkte (Mittlere Aufgabe)', value: 15 },
    { label: '20 Punkte (Große Aufgabe)', value: 20 },
    { label: '30 Punkte (Sehr große Aufgabe)', value: 30 },
    { label: 'Individuell', value: 0 }
  ];

  useEffect(() => {
    if (open && householdId) {
      fetchHouseholdMembers();
    }
  }, [open, householdId]);

  const fetchHouseholdMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_id')
        .eq('household_id', householdId);

      if (error) throw error;
      setHouseholdMembers(data || []);
    } catch (error) {
      console.error('Error fetching household members:', error);
      toast({
        title: "Error",
        description: "Failed to load household members.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedTo('unassigned');
    setPriority('medium');
    setPoints(10);
    setDueDate(undefined);
    setCategory('');
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || null,
        household_id: householdId,
        created_by: userId,
        assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
        priority,
        points,
        due_date: dueDate ? dueDate.toISOString() : null,
        status: 'pending' as const
      };

      const { error } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Task "${title}" has been created successfully.`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Neue Aufgabe erstellen
          </DialogTitle>
          <DialogDescription>
            Erstelle eine neue Aufgabe für dein Household. Vergib Punkte und weise sie Mitgliedern zu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Titel */}
          <div className="grid gap-2">
            <Label htmlFor="task-title">Titel *</Label>
            <Input
              id="task-title"
              placeholder="z.B. Abwaschen, Staubsaugen..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {/* Beschreibung */}
          <div className="grid gap-2">
            <Label htmlFor="task-description">Beschreibung</Label>
            <Textarea
              id="task-description"
              placeholder="Zusätzliche Details zur Aufgabe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>

          {/* Zuweisung */}
          <div className="grid gap-2">
            <Label htmlFor="assigned-to">Zugewiesen an</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue placeholder="Wähle ein Mitglied oder lasse es offen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Niemand (Gruppenaufgabe)</SelectItem>
                {householdMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kategorie */}
          <div className="grid gap-2">
            <Label htmlFor="category">Kategorie</Label>
            <Select value={category} onValueChange={setCategory} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue placeholder="Wähle eine Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priorität */}
          <div className="grid gap-2">
            <Label htmlFor="priority">Priorität</Label>
            <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Punkte */}
          <div className="grid gap-2">
            <Label htmlFor="points">Punktewert</Label>
            <Select 
              value={points.toString()} 
              onValueChange={(value) => {
                const numValue = parseInt(value);
                setPoints(numValue === 0 ? 10 : numValue);
              }} 
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pointValues.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {points !== 5 && points !== 10 && points !== 15 && points !== 20 && points !== 30 && (
              <Input
                type="number"
                min="1"
                max="100"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                disabled={isCreating}
                className="mt-2"
                placeholder="Individuelle Punktzahl"
              />
            )}
          </div>

          {/* Deadline */}
          <div className="grid gap-2">
            <Label>Deadline (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={isCreating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd.MM.yyyy") : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleDialogClose(false)}
            disabled={isCreating}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateTask}
            disabled={isCreating || !title.trim()}
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aufgabe erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};