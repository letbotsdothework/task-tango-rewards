export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          household_id: string
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          household_id: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invite_token: string
          invited_by: string
          invited_email: string
          invited_role: Database["public"]["Enums"]["app_role"]
          is_accepted: boolean
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          invite_token?: string
          invited_by: string
          invited_email: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          is_accepted?: boolean
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          invite_token?: string
          invited_by?: string
          invited_email?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          is_accepted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          household_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          household_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          household_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          is_sent: boolean | null
          reminder_time: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          reminder_time: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          reminder_time?: string
          task_id?: string
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          claimed_at: string
          claimed_by: string
          id: string
          points_spent: number
          reward_id: string
        }
        Insert: {
          claimed_at?: string
          claimed_by: string
          id?: string
          points_spent: number
          reward_id: string
        }
        Update: {
          claimed_at?: string
          claimed_by?: string
          id?: string
          points_spent?: number
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          household_id: string
          id: string
          is_active: boolean
          points_cost: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          household_id: string
          id?: string
          is_active?: boolean
          points_cost: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          household_id?: string
          id?: string
          is_active?: boolean
          points_cost?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string
          id: string
          points_awarded: number
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          id?: string
          points_awarded: number
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          id?: string
          points_awarded?: number
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assignment_type: string | null
          bonus_points: number | null
          challenge_deadline: string | null
          color: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          custom_category: string | null
          description: string | null
          due_date: string | null
          household_id: string
          icon: string | null
          id: string
          image_url: string | null
          is_challenge: boolean | null
          is_private: boolean | null
          is_recurring: boolean | null
          next_occurrence: string | null
          notes: string | null
          points: number
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern: string | null
          rotation_order: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignment_type?: string | null
          bonus_points?: number | null
          challenge_deadline?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          custom_category?: string | null
          description?: string | null
          due_date?: string | null
          household_id: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_challenge?: boolean | null
          is_private?: boolean | null
          is_recurring?: boolean | null
          next_occurrence?: string | null
          notes?: string | null
          points?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          rotation_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignment_type?: string | null
          bonus_points?: number | null
          challenge_deadline?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          custom_category?: string | null
          description?: string | null
          due_date?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_challenge?: boolean | null
          is_private?: boolean | null
          is_recurring?: boolean | null
          next_occurrence?: string | null
          notes?: string | null
          points?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          rotation_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_can_view_profile: {
        Args: { _household_id: string; _profile_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "moderator"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "moderator"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
    },
  },
} as const
