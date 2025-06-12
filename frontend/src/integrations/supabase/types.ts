export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      branch_staff: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_active: string | null
          last_name: string
          phone: string | null
          pin: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_active?: string | null
          last_name: string
          phone?: string | null
          pin: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_active?: string | null
          last_name?: string
          phone?: string | null
          pin?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          created_at: string | null
          email: string | null
          facilities: string[] | null
          hours: string | null
          id: string
          image_url: string | null
          member_count: number | null
          name: string
          phone: string | null
          staff_count: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          email?: string | null
          facilities?: string[] | null
          hours?: string | null
          id?: string
          image_url?: string | null
          member_count?: number | null
          name: string
          phone?: string | null
          staff_count?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          email?: string | null
          facilities?: string[] | null
          hours?: string | null
          id?: string
          image_url?: string | null
          member_count?: number | null
          name?: string
          phone?: string | null
          staff_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gym_staff: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          experience_years: number | null
          id: string
          is_displayed: boolean | null
          name: string
          photo_url: string | null
          role: string
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          is_displayed?: boolean | null
          name: string
          photo_url?: string | null
          role: string
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          is_displayed?: boolean | null
          name?: string
          photo_url?: string | null
          role?: string
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      member_check_ins: {
        Row: {
          branch_id: string | null
          check_in_date: string
          check_in_time: string
          created_at: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          branch_id?: string | null
          check_in_date?: string
          check_in_time?: string
          created_at?: string | null
          id?: string
          member_id?: string | null
        }
        Update: {
          branch_id?: string | null
          check_in_date?: string
          check_in_time?: string
          created_at?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_check_ins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_check_ins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_renewals: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          member_id: string | null
          new_expiry: string
          package_id: string | null
          payment_method: string | null
          previous_expiry: string
          renewed_by_staff_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          member_id?: string | null
          new_expiry: string
          package_id?: string | null
          payment_method?: string | null
          previous_expiry: string
          renewed_by_staff_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          member_id?: string | null
          new_expiry?: string
          package_id?: string | null
          payment_method?: string | null
          previous_expiry?: string
          renewed_by_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_renewals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_renewals_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_renewals_renewed_by_staff_id_fkey"
            columns: ["renewed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "branch_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      member_reports: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          member_id: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_reports_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          branch_id: string | null
          created_at: string | null
          email: string
          expiry_date: string
          first_name: string
          id: string
          is_verified: boolean | null
          last_name: string
          national_id: string
          package_name: string
          package_price: number
          package_type: string | null
          phone: string
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          email: string
          expiry_date: string
          first_name: string
          id?: string
          is_verified?: boolean | null
          last_name: string
          national_id: string
          package_name: string
          package_price?: number
          package_type?: string | null
          phone: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          email?: string
          expiry_date?: string
          first_name?: string
          id?: string
          is_verified?: boolean | null
          last_name?: string
          national_id?: string
          package_name?: string
          package_price?: number
          package_type?: string | null
          phone?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string | null
          duration_months: number
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          benefits: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          benefits?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          benefits?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      staff_actions_log: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          id: string
          member_id: string | null
          staff_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          id?: string
          member_id?: string | null
          staff_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          id?: string
          member_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_actions_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_actions_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "branch_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_status: "active" | "expired" | "suspended"
      package_type: "individual" | "couple"
      payment_method: "card" | "cash"
      staff_role: "manager" | "senior_staff" | "associate"
      user_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_status: ["active", "expired", "suspended"],
      package_type: ["individual", "couple"],
      payment_method: ["card", "cash"],
      staff_role: ["manager", "senior_staff", "associate"],
      user_role: ["admin", "member"],
    },
  },
} as const
