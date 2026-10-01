export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          created_at: string
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          role_title: string | null
          phone: string | null
          department_outlet: string | null
          seq_no: number
          sicil_no: string | null
          termination_date: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          role_title?: string | null
          phone?: string | null
          department_outlet?: string | null
          seq_no: number
          sicil_no?: string | null
          termination_date?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          role_title?: string | null
          phone?: string | null
          department_outlet?: string | null
          seq_no?: number
          sicil_no?: string | null
          termination_date?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          role: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          role?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      puantaj_entries: {
        Row: {
          created_at: string
          date: string
          employee_id: string | null
          id: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          employee_id?: string | null
          id?: string
          status: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string | null
          id?: string
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "puantaj_entries_employee_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puantaj_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      tutanaks: {
        Row: {
          created_at: string
          created_by: string | null
          document_url: string
          id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_url: string
          id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_url?: string
          id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutanaks_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutanaks_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          google_refresh_token: string | null
          hotel_name: string | null
          hotel_group: string | null
          id: string
          is_onboarded: boolean | null
          initialized_months: string[]
          name: string
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          google_refresh_token?: string | null
          hotel_name?: string | null
          hotel_group?: string | null
          id?: string
          is_onboarded?: boolean | null
          initialized_months?: string[]
          name: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          google_refresh_token?: string | null
          hotel_name?: string | null
          hotel_group?: string | null
          id?: string
          is_onboarded?: boolean | null
          initialized_months?: string[]
          name?: string
        }
        Relationships: []
      }
      workspace_notes: {
        Row: {
          id: string
          workspace_id: string | null
          content: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          content?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
