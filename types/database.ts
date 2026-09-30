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
      workspaces: {
        Row: {
          id: string
          name: string
          hotel_group: string | null
          drive_folder_id: string | null
          google_refresh_token: string | null
          is_onboarded: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          hotel_group?: string | null
          drive_folder_id?: string | null
          google_refresh_token?: string | null
          is_onboarded?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          hotel_group?: string | null
          drive_folder_id?: string | null
          google_refresh_token?: string | null
          is_onboarded?: boolean | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          workspace_id: string | null
          first_name: string
          last_name: string
          role: string | null
          created_at: string
        }
        Insert: {
          id: string
          workspace_id?: string | null
          first_name: string
          last_name: string
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          first_name?: string
          last_name?: string
          role?: string | null
          created_at?: string
        }
      }
      tutanaks: {
        Row: {
          id: string
          workspace_id: string | null
          created_by: string | null
          document_url: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          created_by?: string | null
          document_url: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          created_by?: string | null
          document_url?: string
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          workspace_id: string | null
          seq_no: number
          sicil_no: string | null
          full_name: string
          role_title: string | null
          hire_date: string | null
          termination_date: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          seq_no: number
          sicil_no?: string | null
          full_name: string
          role_title?: string | null
          hire_date?: string | null
          termination_date?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          seq_no?: number
          sicil_no?: string | null
          full_name?: string
          role_title?: string | null
          hire_date?: string | null
          termination_date?: string | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      puantaj_entries: {
        Row: {
          id: string
          workspace_id: string | null
          employee_id: string | null
          date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          employee_id?: string | null
          date: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          employee_id?: string | null
          date?: string
          status?: string
          created_at?: string
        }
      }
    }
  }
}
