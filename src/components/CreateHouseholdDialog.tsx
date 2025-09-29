import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Home, Loader2 } from 'lucide-react';

interface CreateHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

export const CreateHouseholdDialog = ({
  open,
  onOpenChange,
  onSuccess,
  userId
}) => {
  const [householdName, setHouseholdName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a household name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create the household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: householdName.trim()
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Update the user's profile to join the household as admin
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          household_id: household.id,
          role: 'admin'
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success!",
        description: `Household "${householdName}" has been created successfully.`,
      });

      setHouseholdName('');
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error creating household:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create household.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Create New Household
          </DialogTitle>
          <DialogDescription>
            Create a new household to start organizing tasks and managing rewards with your family or roommates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="household-name">Household Name</Label>
            <Input
              id="household-name"
              placeholder="e.g., Smith Family, Apartment 4B"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateHousehold}
            disabled={isCreating || !householdName.trim()}
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Household
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};