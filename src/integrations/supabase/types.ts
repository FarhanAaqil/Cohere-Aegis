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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          date: string
          id: string
          notes: string | null
          overtime_seconds: number
          status: Database["public"]["Enums"]["attendance_status"]
          total_work_seconds: number
          undertime_seconds: number
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          notes?: string | null
          overtime_seconds?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          total_work_seconds?: number
          undertime_seconds?: number
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          notes?: string | null
          overtime_seconds?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          total_work_seconds?: number
          undertime_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          date: string
          id: string
          original_in: string | null
          original_out: string | null
          reason: string
          requested_in: string
          requested_out: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["correction_status"]
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          original_in?: string | null
          original_out?: string | null
          reason: string
          requested_in: string
          requested_out: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          original_in?: string | null
          original_out?: string | null
          reason?: string
          requested_in?: string
          requested_out?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_history: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          timestamp: string
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          timestamp?: string
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          timestamp?: string
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      breaks: {
        Row: {
          break_end: string | null
          break_start: string
          created_at: string
          date: string
          duration_seconds: number
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          break_end?: string | null
          break_start: string
          created_at?: string
          date: string
          duration_seconds?: number
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          break_end?: string | null
          break_start?: string
          created_at?: string
          date?: string
          duration_seconds?: number
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breaks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "work_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["chat_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_type: Database["public"]["Enums"]["chat_group_type"]
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_type?: Database["public"]["Enums"]["chat_group_type"]
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_type?: Database["public"]["Enums"]["chat_group_type"]
          id?: string
          name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          group_id: string
          id: string
          is_deleted: boolean
          message_text: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          group_id: string
          id?: string
          is_deleted?: boolean
          message_text: string
          sender_id: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          group_id?: string
          id?: string
          is_deleted?: boolean
          message_text?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          device_id: string
          id: string
          last_seen_at: string | null
          os_type: Database["public"]["Enums"]["os_type"]
          user_id: string
        }
        Insert: {
          device_id: string
          id?: string
          last_seen_at?: string | null
          os_type: Database["public"]["Enums"]["os_type"]
          user_id: string
        }
        Update: {
          device_id?: string
          id?: string
          last_seen_at?: string | null
          os_type?: Database["public"]["Enums"]["os_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          device_id: string | null
          id: string
          metadata: Json | null
          processed: boolean
          processed_at: string | null
          timestamp: string
          type: Database["public"]["Enums"]["event_type"]
          user_id: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          metadata?: Json | null
          processed?: boolean
          processed_at?: string | null
          timestamp: string
          type: Database["public"]["Enums"]["event_type"]
          user_id: string
        }
        Update: {
          device_id?: string | null
          id?: string
          metadata?: Json | null
          processed?: boolean
          processed_at?: string | null
          timestamp?: string
          type?: Database["public"]["Enums"]["event_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      heartbeats: {
        Row: {
          device_id: string
          id: string
          last_seen: string
          timestamp: string
          user_id: string
        }
        Insert: {
          device_id: string
          id?: string
          last_seen?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          device_id?: string
          id?: string
          last_seen?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heartbeats_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heartbeats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshots: {
        Row: {
          created_at: string
          id: string
          is_blurred: boolean
          session_id: string | null
          storage_path: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_blurred?: boolean
          session_id?: string | null
          storage_path: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_blurred?: boolean
          session_id?: string | null
          storage_path?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_activity: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          monitor_token: string
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          monitor_token?: string
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          monitor_token?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["session_source"]
          start_time: string
          total_active_seconds: number
          total_idle_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["session_source"]
          start_time: string
          total_active_seconds?: number
          total_idle_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["session_source"]
          start_time?: string
          total_active_seconds?: number
          total_idle_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attendance_status: "PRESENT" | "ABSENT" | "LEAVE" | "HOLIDAY"
      chat_group_type: "GENERAL" | "TEAM" | "PROJECT" | "DIRECT"
      chat_member_role: "ADMIN" | "MEMBER"
      correction_status: "PENDING" | "APPROVED" | "REJECTED"
      event_type:
        | "LOGIN"
        | "LOGOUT"
        | "ACTIVITY"
        | "IDLE_START"
        | "IDLE_END"
        | "MANUAL_CLOCK_IN"
        | "MANUAL_CLOCK_OUT"
      os_type: "WINDOWS" | "MACOS" | "LINUX"
      session_source: "AUTO" | "MANUAL" | "MIXED"
      task_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      task_status: "TODO" | "IN_PROGRESS" | "DONE"
      user_role: "EMPLOYEE" | "MANAGER" | "ADMIN" | "HR_MANAGER"
      user_status: "ACTIVE" | "INACTIVE"
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
      attendance_status: ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"],
      chat_group_type: ["GENERAL", "TEAM", "PROJECT", "DIRECT"],
      chat_member_role: ["ADMIN", "MEMBER"],
      correction_status: ["PENDING", "APPROVED", "REJECTED"],
      event_type: [
        "LOGIN",
        "LOGOUT",
        "ACTIVITY",
        "IDLE_START",
        "IDLE_END",
        "MANUAL_CLOCK_IN",
        "MANUAL_CLOCK_OUT",
      ],
      os_type: ["WINDOWS", "MACOS", "LINUX"],
      session_source: ["AUTO", "MANUAL", "MIXED"],
      task_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      task_status: ["TODO", "IN_PROGRESS", "DONE"],
      user_role: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"],
      user_status: ["ACTIVE", "INACTIVE"],
    },
  },
} as const
