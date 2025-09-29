import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Home, Mail, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface InviteData {
  id: string;
  household_id: string;
  invited_email: string;
  expires_at: string;
  is_accepted: boolean;
  households: {
    name: string;
  };
  profiles: {
    display_name: string;
  };
}

export const InviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign up form state (for new users)
  const [isNewUser, setIsNewUser] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) {
      fetchInvite();
    }
  }, [token]);

  useEffect(() => {
    if (user && invite && !invite.is_accepted) {
      // User is logged in, check if they can accept
      if (user.email?.toLowerCase() === invite.invited_email.toLowerCase()) {
        // Email matches, can accept automatically
        handleAcceptInvite();
      } else {
        setError('Du bist mit einer anderen E-Mail-Adresse angemeldet. Bitte melde dich mit der eingeladenen E-Mail ab und wieder an.');
      }
    }
  }, [user, invite]);

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('household_invites')
        .select(`
          id,
          household_id,
          invited_email,
          expires_at,
          is_accepted,
          invited_by
        `)
        .eq('invite_token', token)
        .single();

      if (error) {
        console.error('Error fetching invite:', error);
        setError('Einladung nicht gefunden oder abgelaufen.');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Diese Einladung ist abgelaufen.');
        return;
      }

      if (data.is_accepted) {
        setError('Diese Einladung wurde bereits akzeptiert.');
        return;
      }

      // Get household and inviter info separately
      const [householdResult, inviterResult] = await Promise.all([
        supabase.from('households').select('name').eq('id', data.household_id).single(),
        supabase.from('profiles').select('display_name').eq('id', data.invited_by).single()
      ]);

      const inviteData = {
        ...data,
        households: { name: householdResult.data?.name || 'Unbekannter Haushalt' },
        profiles: { display_name: inviterResult.data?.display_name || 'Unbekannter Einlader' }
      };

      setInvite(inviteData);
      setEmail(data.invited_email);
    } catch (error) {
      console.error('Error:', error);
      setError('Fehler beim Laden der Einladung.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;

    setIsAccepting(true);
    try {
      // Update user's household
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ household_id: invite.household_id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Mark invite as accepted
      const { error: inviteError } = await supabase
        .from('household_invites')
        .update({ 
          is_accepted: true, 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', invite.id);

      if (inviteError) throw inviteError;

      toast({
        title: "Erfolgreich beigetreten! 🎉",
        description: `Du bist jetzt Mitglied von "${invite.households.name}".`,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Beitreten zum Haushalt.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte fülle alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsAccepting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
        }
      });

      if (error) throw error;

      toast({
        title: "Registrierung erfolgreich!",
        description: "Du wirst automatisch zum Haushalt hinzugefügt.",
      });
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler bei der Registrierung.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className="text-destructive">Einladung ungültig</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Zur Startseite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  // If user is logged in and email matches, show accept button
  if (user && user.email?.toLowerCase() === invite.invited_email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Home className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle>Einladung zu "{invite.households.name}"</CardTitle>
            <CardDescription>
              Du wurdest von {invite.profiles.display_name} eingeladen, diesem Haushalt beizutreten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{invite.invited_email}</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Angemeldet als: {user.email}</span>
              </div>
            </div>
            <Button 
              onClick={handleAcceptInvite} 
              disabled={isAccepting}
              className="w-full"
            >
              {isAccepting ? (
                "Trete bei..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Einladung akzeptieren
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is not logged in or email doesn't match, show sign up/login options
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Home className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle>Einladung zu "{invite.households.name}"</CardTitle>
          <CardDescription>
            Du wurdest von {invite.profiles.display_name} eingeladen, diesem Haushalt beizutreten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Erstelle ein Konto oder melde dich an, um der Einladung zu folgen.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="display-name">Name</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="Dein Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isAccepting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={true}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Passwort wählen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isAccepting}
                  />
                </div>
                <Button 
                  onClick={handleSignUp}
                  disabled={isAccepting}
                  className="w-full"
                >
                  {isAccepting ? "Erstelle Konto..." : "Konto erstellen & Beitreten"}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Bereits ein Konto?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-normal"
                    onClick={() => navigate('/auth')}
                  >
                    Hier anmelden
                  </Button>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
              <p className="text-sm text-muted-foreground">
                Du bist mit einer anderen E-Mail-Adresse angemeldet.
              </p>
              <p className="text-xs text-muted-foreground">
                Eingeladen: {invite.invited_email}<br />
                Angemeldet: {user.email}
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Mit anderer E-Mail anmelden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};