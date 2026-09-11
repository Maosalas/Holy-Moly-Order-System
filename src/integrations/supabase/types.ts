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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          card_type: string
          created_at: string
          id: string
          organization_id: string
          purchase_date: string
          receipt_url: string | null
          supermarket_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          card_type?: string
          created_at?: string
          id?: string
          organization_id: string
          purchase_date?: string
          receipt_url?: string | null
          supermarket_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          card_type?: string
          created_at?: string
          id?: string
          organization_id?: string
          purchase_date?: string
          receipt_url?: string | null
          supermarket_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          cost: number
          created_at: string
          id: string
          name: string
          organization_id: string
          provider: string
          qty_provider: number
          units: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          name: string
          organization_id: string
          provider?: string
          qty_provider?: number
          units?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          provider?: string
          qty_provider?: number
          units?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_stock: number
          id: string
          inventory_item_id: string
          is_read: boolean
          is_resolved: boolean
          item_name: string
          min_stock_threshold: number
          organization_id: string
          resolved_at: string | null
          unit: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_stock?: number
          id?: string
          inventory_item_id: string
          is_read?: boolean
          is_resolved?: boolean
          item_name?: string
          min_stock_threshold?: number
          organization_id: string
          resolved_at?: string | null
          unit?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_stock?: number
          id?: string
          inventory_item_id?: string
          is_read?: boolean
          is_resolved?: boolean
          item_name?: string
          min_stock_threshold?: number
          organization_id?: string
          resolved_at?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          ingredient_id: string | null
          item_name: string
          item_type: string
          last_restock_date: string | null
          min_stock_threshold: number
          organization_id: string
          supply_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          ingredient_id?: string | null
          item_name: string
          item_type?: string
          last_restock_date?: string | null
          min_stock_threshold?: number
          organization_id: string
          supply_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          ingredient_id?: string | null
          item_name?: string
          item_type?: string
          last_restock_date?: string | null
          min_stock_threshold?: number
          organization_id?: string
          supply_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          item_name: string
          movement_type: string
          new_stock: number
          notes: string | null
          organization_id: string
          previous_stock: number
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          item_name?: string
          movement_type: string
          new_stock?: number
          notes?: string | null
          organization_id: string
          previous_stock?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          item_name?: string
          movement_type?: string
          new_stock?: number
          notes?: string | null
          organization_id?: string
          previous_stock?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchases: {
        Row: {
          cost: number
          created_at: string
          expense_id: string | null
          id: string
          inventory_item_id: string
          item_name: string
          notes: string | null
          organization_id: string
          purchase_date: string
          quantity: number
          supplier_name: string | null
          unit: string
        }
        Insert: {
          cost?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          inventory_item_id: string
          item_name?: string
          notes?: string | null
          organization_id: string
          purchase_date?: string
          quantity?: number
          supplier_name?: string | null
          unit?: string
        }
        Update: {
          cost?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          inventory_item_id?: string
          item_name?: string
          notes?: string | null
          organization_id?: string
          purchase_date?: string
          quantity?: number
          supplier_name?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchases_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchases_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_portal_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string
          organization_id: string
          revoked: boolean
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          organization_id: string
          revoked?: boolean
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          organization_id?: string
          revoked?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_portal_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_portal_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          charge_amount: number
          client_name: string
          client_photos: Json
          cost_amount: number
          created_at: string
          delivery_date: string
          down_payment: number
          id: string
          needs_cake_topper: boolean
          order_details: string
          organization_id: string
          payment_method: string
          phone_number: string
          quotation_id: string | null
          statuses: Json
          supplies_needed: string
          topper_details: string | null
          topper_photos: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          charge_amount?: number
          client_name: string
          client_photos?: Json
          cost_amount?: number
          created_at?: string
          delivery_date?: string
          down_payment?: number
          id?: string
          needs_cake_topper?: boolean
          order_details?: string
          organization_id: string
          payment_method?: string
          phone_number?: string
          quotation_id?: string | null
          statuses?: Json
          supplies_needed?: string
          topper_details?: string | null
          topper_photos?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          charge_amount?: number
          client_name?: string
          client_photos?: Json
          cost_amount?: number
          created_at?: string
          delivery_date?: string
          down_payment?: number
          id?: string
          needs_cake_topper?: boolean
          order_details?: string
          organization_id?: string
          payment_method?: string
          phone_number?: string
          quotation_id?: string | null
          statuses?: Json
          supplies_needed?: string
          topper_details?: string | null
          topper_photos?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          additional_expenses: Json
          additional_ingredients: Json
          client_name: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          profit: number | null
          profit_margin: number | null
          recipes: Json
          selected_supplies: Json
          selling_price: number | null
          size: string | null
          total_cost: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_expenses?: Json
          additional_ingredients?: Json
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          profit?: number | null
          profit_margin?: number | null
          recipes?: Json
          selected_supplies?: Json
          selling_price?: number | null
          size?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_expenses?: Json
          additional_ingredients?: Json
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          profit?: number | null
          profit_margin?: number | null
          recipes?: Json
          selected_supplies?: Json
          selling_price?: number | null
          size?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_parameters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string
          parameter_key: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          parameter_key: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          parameter_key?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_parameters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          categories: Json
          created_at: string
          elaborations: Json
          id: string
          image: string | null
          name: string
          notes: string
          organization_id: string
          supplies: Json
          total_cost: number
          total_weight: number | null
          total_weight_unit: string | null
          unit_cost: number | null
          units: number | null
          updated_at: string
          url: string
          used_parameters: Json
          user_id: string | null
          variations: Json
        }
        Insert: {
          categories?: Json
          created_at?: string
          elaborations?: Json
          id?: string
          image?: string | null
          name: string
          notes?: string
          organization_id: string
          supplies?: Json
          total_cost?: number
          total_weight?: number | null
          total_weight_unit?: string | null
          unit_cost?: number | null
          units?: number | null
          updated_at?: string
          url?: string
          used_parameters?: Json
          user_id?: string | null
          variations?: Json
        }
        Update: {
          categories?: Json
          created_at?: string
          elaborations?: Json
          id?: string
          image?: string | null
          name?: string
          notes?: string
          organization_id?: string
          supplies?: Json
          total_cost?: number
          total_weight?: number | null
          total_weight_unit?: string | null
          unit_cost?: number | null
          units?: number | null
          updated_at?: string
          url?: string
          used_parameters?: Json
          user_id?: string | null
          variations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          max_orders_per_month: number
          max_storage_gb: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_orders_per_month?: number
          max_storage_gb?: number
          max_users?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_orders_per_month?: number
          max_storage_gb?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          cost: number
          created_at: string
          id: string
          name: string
          organization_id: string
          quantity: number
          supplier_name: string
          unit: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          name: string
          organization_id: string
          quantity?: number
          supplier_name?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          quantity?: number
          supplier_name?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_global_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["global_app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["global_app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["global_app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_global_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_plan_limit: {
        Args: { _current_value: number; _limit_type: string; _org_id: string }
        Returns: boolean
      }
      create_organization: {
        Args: { _name: string; _slug?: string }
        Returns: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_order_by_portal_token: { Args: { _token: string }; Returns: Json }
      get_organization_plan: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          max_orders_per_month: number
          max_storage_gb: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_organization_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      is_organization_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      billing_interval: "monthly" | "yearly"
      global_app_role: "super_admin"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin", "member"],
      billing_interval: ["monthly", "yearly"],
      global_app_role: ["super_admin"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
    },
  },
} as const
