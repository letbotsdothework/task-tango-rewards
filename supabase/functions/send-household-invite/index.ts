import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  householdId: string;
  invitedEmail: string;
  householdName: string;
  inviterName: string;
  invitedRole?: 'admin' | 'moderator' | 'member';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { householdId, invitedEmail, householdName, inviterName, invitedRole = 'member' }: InviteRequest = await req.json();

    // Validate input
    if (!householdId || !invitedEmail || !householdName || !inviterName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'member'];
    if (!validRoles.includes(invitedRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin of the household
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, household_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.household_id !== householdId || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already in the household
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', householdId)
      .ilike('display_name', invitedEmail)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "User is already a member of this household" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('household_invites')
      .select('id')
      .eq('household_id', householdId)
      .eq('invited_email', invitedEmail)
      .eq('is_accepted', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    let inviteToken: string;

    if (existingInvite) {
      // Use existing invite token
      const { data: invite } = await supabase
        .from('household_invites')
        .select('invite_token')
        .eq('id', existingInvite.id)
        .single();
      inviteToken = invite?.invite_token;
    } else {
      // Create new invite
      const { data: newInvite, error: inviteError } = await supabase
        .from('household_invites')
        .insert([{
          household_id: householdId,
          invited_email: invitedEmail,
          invited_by: user.id,
          invited_role: invitedRole,
        }])
        .select('invite_token')
        .single();

      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        return new Response(
          JSON.stringify({ error: "Failed to create invitation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      inviteToken = newInvite.invite_token;
    }

    // Send invitation email
    const inviteUrl = `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/invite/${inviteToken}`;
    
    const emailResponse = await resend.emails.send({
      from: "TaskMaster <noreply@resend.dev>",
      to: [invitedEmail],
      subject: `Einladung zu "${householdName}" Haushalt`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">🏠 Haushalt Einladung</h2>
          
          <p style="font-size: 16px; color: #555;">
            Hallo!<br><br>
            Du wurdest von <strong>${inviterName}</strong> eingeladen, dem Haushalt "<strong>${householdName}</strong>" beizutreten.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
              Einladung akzeptieren
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777;">
            Oder kopiere diesen Link in deinen Browser:<br>
            <a href="${inviteUrl}" style="color: #4CAF50; word-break: break-all;">${inviteUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Diese Einladung läuft in 7 Tagen ab.<br>
            Falls du diese E-Mail nicht erwartet hast, kannst du sie einfach ignorieren.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Einladung erfolgreich versendet",
        inviteToken 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-household-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);