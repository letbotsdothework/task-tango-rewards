import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface JoinHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

interface Household {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
}

export const JoinHouseholdDialog: React.FC<JoinHouseholdDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  userId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const searchHouseholds = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a household name to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('households')
        .select(`
          id,
          name,
          created_at,
          profiles:profiles(count)
        `)
        .ilike('name', `%${searchQuery.trim()}%`)
        .limit(10);

      if (error) throw error;

      const householdsWithCount = data?.map(household => ({
        ...household,
        member_count: household.profiles?.length || 0
      })) || [];

      setHouseholds(householdsWithCount);

      if (householdsWithCount.length === 0) {
        toast({
          title: "No households found",
          description: "No households found with that name. Try a different search term.",
        });
      }

    } catch (error: any) {
      console.error('Error searching households:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to search households.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const joinHousehold = async (householdId: string, householdName: string) => {
    setIsJoining(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          household_id: householdId,
          role: 'member'
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `You have joined "${householdName}" successfully.`,
      });

      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error joining household:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join household.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      setHouseholds([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join Existing Household
          </DialogTitle>
          <DialogDescription>
            Search for an existing household by name to join and start collaborating on tasks.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search-query">Search Household Name</Label>
              <Input
                id="search-query"
                placeholder="Enter household name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching || isJoining}
                onKeyPress={(e) => e.key === 'Enter' && searchHouseholds()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchHouseholds}
                disabled={isSearching || isJoining || !searchQuery.trim()}
                size="icon"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {households.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label>Available Households</Label>
              {households.map((household) => (
                <Card key={household.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm">{household.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {household.member_count} member{household.member_count !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => joinHousehold(household.id, household.name)}
                        disabled={isJoining}
                      >
                        {isJoining ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Join'
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleDialogClose(false)}
            disabled={isSearching || isJoining}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};