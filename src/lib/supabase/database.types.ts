// Hand-written to mirror supabase/migrations. Keep in sync with the SQL.
// Same shape as `supabase gen types typescript` output, so it can be
// replaced by generated types later without touching call sites.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          name: string;
          type: Database["public"]["Enums"]["account_type"];
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          type?: Database["public"]["Enums"]["account_type"];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["account_type"];
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          color: string;
          icon: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          color?: string;
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: Database["public"]["Enums"]["category_kind"];
          name?: string;
          color?: string;
          icon?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          name: string;
          target: number;
          deadline: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          target: number;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target?: number;
          deadline?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          file_name: string;
          file_type: string;
          parser_id: string;
          row_count: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          file_name: string;
          file_type: string;
          parser_id: string;
          row_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_type?: string;
          parser_id?: string;
          row_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          date: string;
          amount: number;
          description: string;
          merchant: string | null;
          category_id: string | null;
          account_id: string | null;
          savings_goal_id: string | null;
          source: Database["public"]["Enums"]["transaction_source"];
          import_batch_id: string | null;
          dedupe_hash: string | null;
          is_transfer: boolean;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date: string;
          amount: number;
          description?: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id?: string | null;
          savings_goal_id?: string | null;
          source?: Database["public"]["Enums"]["transaction_source"];
          import_batch_id?: string | null;
          dedupe_hash?: string | null;
          is_transfer?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          amount?: number;
          description?: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id?: string | null;
          savings_goal_id?: string | null;
          source?: Database["public"]["Enums"]["transaction_source"];
          import_batch_id?: string | null;
          dedupe_hash?: string | null;
          is_transfer?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_savings_goal_id_fkey";
            columns: ["savings_goal_id"];
            isOneToOne: false;
            referencedRelation: "savings_goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      category_rules: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          pattern: string;
          field: Database["public"]["Enums"]["rule_field"];
          category_id: string;
          priority: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          pattern: string;
          field?: Database["public"]["Enums"]["rule_field"];
          category_id: string;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pattern?: string;
          field?: Database["public"]["Enums"]["rule_field"];
          category_id?: string;
          priority?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          category_id: string;
          month: string;
          limit_amount: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category_id: string;
          month: string;
          limit_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          month?: string;
          limit_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      category_kind: "income" | "expense" | "savings";
      account_type: "checking" | "savings" | "cash" | "credit";
      transaction_source: "manual" | "import";
      rule_field: "description" | "merchant";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
