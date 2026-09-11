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
      costing_settings: {
        Row: {
          cost_method: string
          created_at: string
          currency: string
          default_margin_pct: number
          deposit_percent: number
          hourly_rate: number
          include_energy: boolean
          include_labor: boolean
          kwh_price: number
          min_margin_pct: number
          min_order_amount: number
          organization_id: string
          oven_kw: number
          overhead_percent: number
          price_rounding: number
          production_loss_pct: number
          quote_valid_days: number
          rush_surcharge_pct: number
          tax_enabled: boolean
          tax_percent: number
          updated_at: string
        }
        Insert: {
          cost_method?: string
          created_at?: string
          currency?: string
          default_margin_pct?: number
          deposit_percent?: number
          hourly_rate?: number
          include_energy?: boolean
          include_labor?: boolean
          kwh_price?: number
          min_margin_pct?: number
          min_order_amount?: number
          organization_id: string
          oven_kw?: number
          overhead_percent?: number
          price_rounding?: number
          production_loss_pct?: number
          quote_valid_days?: number
          rush_surcharge_pct?: number
          tax_enabled?: boolean
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          cost_method?: string
          created_at?: string
          currency?: string
          default_margin_pct?: number
          deposit_percent?: number
          hourly_rate?: number
          include_energy?: boolean
          include_labor?: boolean
          kwh_price?: number
          min_margin_pct?: number
          min_order_amount?: number
          organization_id?: string
          oven_kw?: number
          overhead_percent?: number
          price_rounding?: number
          production_loss_pct?: number
          quote_valid_days?: number
          rush_surcharge_pct?: number
          tax_enabled?: boolean
          tax_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "costing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
      ingredient_presentations: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          ingredient_id: string
          is_default: boolean
          organization_id: string
          price: number
          qty: number
          supplier_id: string | null
          unit_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          id?: string
          ingredient_id: string
          is_default?: boolean
          organization_id: string
          price?: number
          qty: number
          supplier_id?: string | null
          unit_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          ingredient_id?: string
          is_default?: boolean
          organization_id?: string
          price?: number
          qty?: number
          supplier_id?: string | null
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_presentations_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_presentations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_presentations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_presentations_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      ingredient_price_history: {
        Row: {
          cost_per_base: number
          id: string
          ingredient_id: string
          organization_id: string
          recorded_at: string
          source: string
        }
        Insert: {
          cost_per_base: number
          id?: string
          ingredient_id: string
          organization_id: string
          recorded_at?: string
          source: string
        }
        Update: {
          cost_per_base?: number
          id?: string
          ingredient_id?: string
          organization_id?: string
          recorded_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_price_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          active: boolean
          base_unit: string
          category: string | null
          cost: number
          created_at: string
          current_cost: number
          density_g_ml: number | null
          id: string
          last_cost: number
          name: string
          organization_id: string
          provider: string
          qty_provider: number
          unit_weight_g: number | null
          units: string
          updated_at: string
          user_id: string | null
          waste_pct: number
        }
        Insert: {
          active?: boolean
          base_unit?: string
          category?: string | null
          cost?: number
          created_at?: string
          current_cost?: number
          density_g_ml?: number | null
          id?: string
          last_cost?: number
          name: string
          organization_id: string
          provider?: string
          qty_provider?: number
          unit_weight_g?: number | null
          units?: string
          updated_at?: string
          user_id?: string | null
          waste_pct?: number
        }
        Update: {
          active?: boolean
          base_unit?: string
          category?: string | null
          cost?: number
          created_at?: string
          current_cost?: number
          density_g_ml?: number | null
          id?: string
          last_cost?: number
          name?: string
          organization_id?: string
          provider?: string
          qty_provider?: number
          unit_weight_g?: number | null
          units?: string
          updated_at?: string
          user_id?: string | null
          waste_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_base_unit_fkey"
            columns: ["base_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
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
          base_qty: number
          cost: number
          cost_per_base: number
          created_at: string
          expense_id: string | null
          id: string
          ingredient_id: string | null
          inventory_item_id: string | null
          item_name: string
          notes: string | null
          organization_id: string
          presentation_id: string | null
          purchase_date: string
          purchase_invoice_id: string | null
          quantity: number
          supplier_name: string | null
          supply_id: string | null
          unit: string
        }
        Insert: {
          base_qty?: number
          cost?: number
          cost_per_base?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          ingredient_id?: string | null
          inventory_item_id?: string | null
          item_name?: string
          notes?: string | null
          organization_id: string
          presentation_id?: string | null
          purchase_date?: string
          purchase_invoice_id?: string | null
          quantity?: number
          supplier_name?: string | null
          supply_id?: string | null
          unit?: string
        }
        Update: {
          base_qty?: number
          cost?: number
          cost_per_base?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          ingredient_id?: string | null
          inventory_item_id?: string | null
          item_name?: string
          notes?: string | null
          organization_id?: string
          presentation_id?: string | null
          purchase_date?: string
          purchase_invoice_id?: string | null
          quantity?: number
          supplier_name?: string | null
          supply_id?: string | null
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
            foreignKeyName: "inventory_purchases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
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
          {
            foreignKeyName: "inventory_purchases_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "ingredient_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchases_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchases_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
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
      preparation_components: {
        Row: {
          base_qty: number
          child_prep_id: string | null
          component_type: string
          created_at: string
          id: string
          ingredient_id: string | null
          notes: string | null
          preparation_id: string
          qty: number
          sort_order: number
          unit_code: string
          updated_at: string
          waste_pct_override: number | null
        }
        Insert: {
          base_qty?: number
          child_prep_id?: string | null
          component_type: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          preparation_id: string
          qty: number
          sort_order?: number
          unit_code: string
          updated_at?: string
          waste_pct_override?: number | null
        }
        Update: {
          base_qty?: number
          child_prep_id?: string | null
          component_type?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          preparation_id?: string
          qty?: number
          sort_order?: number
          unit_code?: string
          updated_at?: string
          waste_pct_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preparation_components_child_prep_id_fkey"
            columns: ["child_prep_id"]
            isOneToOne: false
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_components_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_components_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_components_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      preparation_costs: {
        Row: {
          batch_cost: number
          breakdown: Json
          calculated_at: string
          cost_per_g: number
          cost_per_portion: number | null
          depth: number
          energy_cost: number
          energy_per_g: number
          labor_cost: number
          labor_per_g: number
          material_cost: number
          material_per_g: number
          preparation_id: string
        }
        Insert: {
          batch_cost?: number
          breakdown?: Json
          calculated_at?: string
          cost_per_g?: number
          cost_per_portion?: number | null
          depth?: number
          energy_cost?: number
          energy_per_g?: number
          labor_cost?: number
          labor_per_g?: number
          material_cost?: number
          material_per_g?: number
          preparation_id: string
        }
        Update: {
          batch_cost?: number
          breakdown?: Json
          calculated_at?: string
          cost_per_g?: number
          cost_per_portion?: number | null
          depth?: number
          energy_cost?: number
          energy_per_g?: number
          labor_cost?: number
          labor_per_g?: number
          material_cost?: number
          material_per_g?: number
          preparation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_costs_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: true
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
        ]
      }
      preparations: {
        Row: {
          active: boolean
          baking_loss_pct: number
          created_at: string
          id: string
          is_seasonal: boolean
          name: string
          notes: string | null
          organization_id: string
          oven_minutes: number
          oven_temp_c: number | null
          photo_url: string | null
          procedure_text: string | null
          setup_minutes: number
          source_url: string | null
          time_minutes: number
          type: string
          updated_at: string
          version: number
          waste_pct: number
          yield_g: number
          yield_portions: number | null
        }
        Insert: {
          active?: boolean
          baking_loss_pct?: number
          created_at?: string
          id?: string
          is_seasonal?: boolean
          name: string
          notes?: string | null
          organization_id: string
          oven_minutes?: number
          oven_temp_c?: number | null
          photo_url?: string | null
          procedure_text?: string | null
          setup_minutes?: number
          source_url?: string | null
          time_minutes?: number
          type?: string
          updated_at?: string
          version?: number
          waste_pct?: number
          yield_g: number
          yield_portions?: number | null
        }
        Update: {
          active?: boolean
          baking_loss_pct?: number
          created_at?: string
          id?: string
          is_seasonal?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          oven_minutes?: number
          oven_temp_c?: number | null
          photo_url?: string | null
          procedure_text?: string | null
          setup_minutes?: number
          source_url?: string | null
          time_minutes?: number
          type?: string
          updated_at?: string
          version?: number
          waste_pct?: number
          yield_g?: number
          yield_portions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preparations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          base_qty: number
          component_type: string
          created_at: string
          id: string
          ingredient_id: string | null
          is_optional: boolean
          preparation_id: string | null
          product_id: string
          qty: number
          role: string
          size_id: string | null
          sort_order: number
          supply_id: string | null
          unit_code: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          base_qty?: number
          component_type: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          is_optional?: boolean
          preparation_id?: string | null
          product_id: string
          qty: number
          role?: string
          size_id?: string | null
          sort_order?: number
          supply_id?: string | null
          unit_code: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          base_qty?: number
          component_type?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          is_optional?: boolean
          preparation_id?: string | null
          product_id?: string
          qty?: number
          role?: string
          size_id?: string | null
          sort_order?: number
          supply_id?: string | null
          unit_code?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_components_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_preparation_id_fkey"
            columns: ["preparation_id"]
            isOneToOne: false
            referencedRelation: "preparations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_components_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          breakdown: Json
          calculated_at: string
          cost_per_portion: number | null
          direct_cost: number
          energy_cost: number
          id: string
          labor_cost: number
          labor_minutes: number
          loss_cost: number
          material_cost: number
          overhead_cost: number
          packaging_cost: number
          product_id: string
          size_id: string | null
          suggested_price: number
          total_cost: number
          variant_id: string | null
        }
        Insert: {
          breakdown?: Json
          calculated_at?: string
          cost_per_portion?: number | null
          direct_cost?: number
          energy_cost?: number
          id?: string
          labor_cost?: number
          labor_minutes?: number
          loss_cost?: number
          material_cost?: number
          overhead_cost?: number
          packaging_cost?: number
          product_id: string
          size_id?: string | null
          suggested_price?: number
          total_cost?: number
          variant_id?: string | null
        }
        Update: {
          breakdown?: Json
          calculated_at?: string
          cost_per_portion?: number | null
          direct_cost?: number
          energy_cost?: number
          id?: string
          labor_cost?: number
          labor_minutes?: number
          loss_cost?: number
          material_cost?: number
          overhead_cost?: number
          packaging_cost?: number
          product_id?: string
          size_id?: string | null
          suggested_price?: number
          total_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_costs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          active: boolean
          assembly_minutes: number
          created_at: string
          id: string
          is_default: boolean
          name: string
          oven_minutes: number
          portions: number | null
          product_id: string
          sort_order: number
          target_weight_g: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          assembly_minutes?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          oven_minutes?: number
          portions?: number | null
          product_id: string
          sort_order?: number
          target_weight_g?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          assembly_minutes?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          oven_minutes?: number
          portions?: number | null
          product_id?: string
          sort_order?: number
          target_weight_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_seasonal: boolean
          name: string
          organization_id: string
          photo_url: string | null
          price_basis: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_seasonal?: boolean
          name: string
          organization_id: string
          photo_url?: string | null
          price_basis?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_seasonal?: boolean
          name?: string
          organization_id?: string
          photo_url?: string | null
          price_basis?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      purchase_invoices: {
        Row: {
          created_at: string
          expense_id: string | null
          freight: number
          id: string
          notes: string | null
          organization_id: string
          purchase_date: string
          receipt_url: string | null
          supplier_id: string | null
          supplier_name: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expense_id?: string | null
          freight?: number
          id?: string
          notes?: string | null
          organization_id: string
          purchase_date?: string
          receipt_url?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expense_id?: string | null
          freight?: number
          id?: string
          notes?: string | null
          organization_id?: string
          purchase_date?: string
          receipt_url?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      suppliers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          base_unit: string
          cost: number
          created_at: string
          current_cost: number
          id: string
          last_cost: number
          name: string
          organization_id: string
          quantity: number
          supplier_name: string
          unit: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_unit?: string
          cost?: number
          created_at?: string
          current_cost?: number
          id?: string
          last_cost?: number
          name: string
          organization_id: string
          quantity?: number
          supplier_name?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_unit?: string
          cost?: number
          created_at?: string
          current_cost?: number
          id?: string
          last_cost?: number
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
            foreignKeyName: "supplies_base_unit_fkey"
            columns: ["base_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
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
      units: {
        Row: {
          code: string
          created_at: string
          factor_to_base: number
          is_input_only: boolean
          magnitude: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          factor_to_base: number
          is_input_only?: boolean
          magnitude: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          factor_to_base?: number
          is_input_only?: boolean
          magnitude?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      fn_calc_product_cost: {
        Args: {
          p_include_optional?: boolean
          p_product_id: string
          p_size_id: string
          p_variant_id: string
        }
        Returns: Json
      }
      fn_costing_price: {
        Args: {
          p_hourly_rate: number
          p_hours: number
          p_include_energy: boolean
          p_include_labor: boolean
          p_kwh_price: number
          p_margin_pct: number
          p_materials: number
          p_oven_kw: number
          p_overhead_percent: number
          p_price_rounding: number
          p_production_loss_pct: number
          p_tax_enabled: boolean
          p_tax_percent: number
        }
        Returns: number
      }
      fn_ingredient_effective_cost: {
        Args: { p_ingredient_id: string; p_waste_override?: number }
        Returns: number
      }
      fn_margin_at_price: {
        Args: { p_cost: number; p_price: number }
        Returns: number
      }
      fn_process_purchase: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      fn_recalc_all: { Args: { p_org: string }; Returns: undefined }
      fn_recalc_preparation_cascade: {
        Args: { p_prep_id: string }
        Returns: undefined
      }
      fn_recalc_preparation_cost: {
        Args: { p_prep_id: string }
        Returns: undefined
      }
      fn_recalc_preparations_using_ingredient: {
        Args: { p_ingredient_id: string }
        Returns: undefined
      }
      fn_recalc_product_costs: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      fn_resolve_product_components: {
        Args: {
          p_include_optional?: boolean
          p_product_id: string
          p_size_id: string
          p_variant_id: string
        }
        Returns: {
          base_qty: number
          component_type: string
          id: string
          ingredient_id: string
          is_optional: boolean
          preparation_id: string
          product_id: string
          qty: number
          role: string
          size_id: string
          sort_order: number
          supply_id: string
          unit_code: string
          variant_id: string
        }[]
      }
      fn_round_price: {
        Args: { p_step?: number; p_value: number }
        Returns: number
      }
      fn_to_base_qty: {
        Args: {
          p_base_unit: string
          p_density: number
          p_qty: number
          p_unit: string
          p_unit_weight: number
        }
        Returns: number
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
