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
      profiles: {
        Row: {
          id: string
          role: 'customer' | 'manager'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'customer' | 'manager'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'customer' | 'manager'
          created_at?: string
          updated_at?: string
        }
      }
      pricing_tiers: {
        Row: {
          id: string
          name: string
          base_price: number
          description: string
          price_per_sqm: number
          min_area: number
          max_area: number | null
          created_at: string
          updated_at: string
          manager_id: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          base_price: number
          description: string
          price_per_sqm?: number
          min_area?: number
          max_area?: number | null
          created_at?: string
          updated_at?: string
          manager_id?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          base_price?: number
          description?: string
          price_per_sqm?: number
          min_area?: number
          max_area?: number | null
          created_at?: string
          updated_at?: string
          manager_id?: string
          is_active?: boolean
        }
      }
      invoices: {
        Row: {
          id: string
          customer_id: string
          manager_id: string
          amount: number
          status: 'draft' | 'sent' | 'paid' | 'cancelled'
          stripe_invoice_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          manager_id: string
          amount: number
          status: 'draft' | 'sent' | 'paid' | 'cancelled'
          stripe_invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          manager_id?: string
          amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'cancelled'
          stripe_invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}