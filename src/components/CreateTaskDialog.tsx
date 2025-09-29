import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Loader2, Plus, Image, Clock, Users, Repeat, Zap, Eye, EyeOff } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
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

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const taskIcons = [
  '🍽️', '🚿', '👕', '🛒', '🗑️', '🧹', '🌱', '📋', '📦', '🏠', 
  '💻', '📚', '🎯', '⚡', '🔥', '💡', '🎨', '🏃‍♂️', '💪', '🎵'
];

const taskColors = [
  { name: 'Rot', value: '#FF6B6B' },
  { name: 'Blau', value: '#4ECDC4' },
  { name: 'Grün', value: '#45B7D1' },
  { name: 'Orange', value: '#FFA726' },
  { name: 'Lila', value: '#AB47BC' },
  { name: 'Gelb', value: '#FFF176' },
  { name: 'Rosa', value: '#EC407A' },
  { name: 'Türkis', value: '#26C6DA' }
];

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  onSuccess,
  userId,
  householdId
}) => {
  // Basic task fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [assignmentType, setAssignmentType] = useState<'individual' | 'group' | 'rotation'>('individual');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [points, setPoints] = useState(10);
  const [dueDate, setDueDate] = useState<Date>();
  
  // New enhanced fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('#4ECDC4');
  const [imageUrl, setImageUrl] = useState('');
  const [isChallenge, setIsChallenge] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [challengeDeadline, setChallengeDeadline] = useState<Date>();
  const [customCategory, setCustomCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reminderHours, setReminderHours] = useState(24);
  
  // Data states
  const [isCreating, setIsCreating] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

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
      fetchCategories();
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
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, color')
        .eq('household_id', householdId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNotes('');
    setAssignedTo('unassigned');
    setAssignmentType('individual');
    setPriority('medium');
    setPoints(10);
    setDueDate(undefined);
    setIsRecurring(false);
    setRecurrencePattern('weekly');
    setIsPrivate(false);
    setSelectedIcon('📋');
    setSelectedColor('#4ECDC4');
    setImageUrl('');
    setIsChallenge(false);
    setBonusPoints(0);
    setChallengeDeadline(undefined);
    setCustomCategory('');
    setSelectedCategory('');
    setReminderHours(24);
  };

  const calculateNextOccurrence = (pattern: string, fromDate: Date = new Date()) => {
    switch (pattern) {
      case 'daily':
        return addDays(fromDate, 1);
      case 'weekly':
        return addWeeks(fromDate, 1);
      case 'monthly':
        return addMonths(fromDate, 1);
      default:
        return null;
    }
  };

  const createCategory = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          household_id: householdId,
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
          created_by: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
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
      // Handle custom category creation
      let categoryToUse = selectedCategory;
      if (customCategory.trim()) {
        const newCategoryId = await createCategory(customCategory);
        if (newCategoryId) {
          categoryToUse = newCategoryId;
        }
      }

      // Calculate next occurrence for recurring tasks
      const nextOccurrence = isRecurring && dueDate ? 
        calculateNextOccurrence(recurrencePattern, dueDate) : null;

      const taskData = {
        title: title.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        household_id: householdId,
        created_by: userId,
        assigned_to: assignmentType === 'individual' && assignedTo !== 'unassigned' ? assignedTo : null,
        assignment_type: assignmentType,
        priority,
        points,
        bonus_points: isChallenge ? bonusPoints : 0,
        due_date: dueDate ? dueDate.toISOString() : null,
        challenge_deadline: isChallenge && challengeDeadline ? challengeDeadline.toISOString() : null,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        next_occurrence: nextOccurrence ? nextOccurrence.toISOString() : null,
        is_private: isPrivate,
        is_challenge: isChallenge,
        icon: selectedIcon,
        color: selectedColor,
        image_url: imageUrl.trim() || null,
        custom_category: categoryToUse || null,
        status: 'pending' as const
      };

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Create reminder if due date is set
      if (dueDate && reminderHours > 0) {
        const reminderTime = new Date(dueDate.getTime() - (reminderHours * 60 * 60 * 1000));
        if (reminderTime > new Date()) {
          await supabase
            .from('reminders')
            .insert([{
              task_id: newTask.id,
              reminder_time: reminderTime.toISOString()
            }]);
        }
      }

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Neue Aufgabe erstellen
          </DialogTitle>
          <DialogDescription>
            Erstelle eine umfassende Aufgabe mit allen verfügbaren Optionen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              📝 Grundinformationen
            </h3>
            
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

            <div className="grid gap-2">
              <Label htmlFor="task-description">Beschreibung</Label>
              <Textarea
                id="task-description"
                placeholder="Zusätzliche Details zur Aufgabe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-notes">Notizen</Label>
              <Textarea
                id="task-notes"
                placeholder="Interne Notizen, Anleitungen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCreating}
                rows={2}
              />
            </div>
          </div>

          {/* Assignment & Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5" />
              Zuweisung
            </h3>
            
            <div className="grid gap-2">
              <Label>Aufgabentyp</Label>
              <Select value={assignmentType} onValueChange={(value) => setAssignmentType(value as 'individual' | 'group' | 'rotation')} disabled={isCreating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Einzelperson</SelectItem>
                  <SelectItem value="group">Gruppe (wer zuerst fertig ist)</SelectItem>
                  <SelectItem value="rotation">Rotation (abwechselnd)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentType === 'individual' && (
              <div className="grid gap-2">
                <Label>Zugewiesen an</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isCreating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle ein Mitglied" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Niemand</SelectItem>
                    {householdMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === 'group' && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Alle Household-Mitglieder können diese Aufgabe sehen und erledigen. 
                  Wer sie zuerst als erledigt markiert, erhält die Punkte.
                </p>
              </div>
            )}

            {assignmentType === 'rotation' && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Die Aufgabe wandert automatisch zwischen den Mitgliedern. 
                  Nach jeder Erledigung wird sie dem nächsten zugewiesen.
                </p>
              </div>
            )}
          </div>

          {/* Category & Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              🎨 Kategorien & Design
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategorie</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isCreating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle eine Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Neue Kategorie</Label>
                <Input
                  placeholder="Eigene Kategorie erstellen..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1">
                  {taskIcons.map((icon) => (
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

              <div className="grid gap-2">
                <Label>Farbe</Label>
                <div className="flex flex-wrap gap-1">
                  {taskColors.map((color) => (
                    <Button
                      key={color.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedColor(color.value)}
                      disabled={isCreating}
                      className="w-8 h-8 p-0"
                      style={{ 
                        backgroundColor: selectedColor === color.value ? color.value : 'transparent',
                        borderColor: color.value 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Bild-URL (optional)</Label>
              <div className="flex gap-2">
                <Image className="w-4 h-4 mt-3" />
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              ⚙️ Aufgabendetails
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priorität</Label>
                <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)} disabled={isCreating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Niedrig</SelectItem>
                    <SelectItem value="medium">🟡 Mittel</SelectItem>
                    <SelectItem value="high">🔴 Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Punktewert</Label>
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
                {![5, 10, 15, 20, 30].includes(points) && (
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                    disabled={isCreating}
                    placeholder="Individuelle Punktzahl"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Deadline</Label>
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
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dueDate && (
              <div className="grid gap-2">
                <Label>Erinnerung (Stunden vorher)</Label>
                <Select value={reminderHours.toString()} onValueChange={(value) => setReminderHours(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Stunde</SelectItem>
                    <SelectItem value="6">6 Stunden</SelectItem>
                    <SelectItem value="24">1 Tag</SelectItem>
                    <SelectItem value="48">2 Tage</SelectItem>
                    <SelectItem value="168">1 Woche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Advanced Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              🚀 Erweiterte Funktionen
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                <Label>Wiederkehrende Aufgabe</Label>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} disabled={isCreating} />
            </div>

            {isRecurring && (
              <div className="grid gap-2">
                <Label>Wiederholung</Label>
                <Select value={recurrencePattern} onValueChange={(value) => setRecurrencePattern(value as 'daily' | 'weekly' | 'monthly')} disabled={isCreating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Täglich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <Label>Challenge-Task (Bonuspunkte)</Label>
              </div>
              <Switch checked={isChallenge} onCheckedChange={setIsChallenge} disabled={isCreating} />
            </div>

            {isChallenge && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Bonuspunkte</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(parseInt(e.target.value) || 0)}
                    disabled={isCreating}
                    placeholder="Extra Punkte"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Challenge-Deadline</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !challengeDeadline && "text-muted-foreground"
                        )}
                        disabled={isCreating}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {challengeDeadline ? format(challengeDeadline, "dd.MM.yyyy") : "Bonus bis..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={challengeDeadline}
                        onSelect={setChallengeDeadline}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <Label>Private Aufgabe</Label>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} disabled={isCreating} />
            </div>

            {isPrivate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Private Aufgaben sind nur für den Zugewiesenen und Admins sichtbar.
                </p>
              </div>
            )}
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
            className="bg-gradient-primary"
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aufgabe erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};