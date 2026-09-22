// Hand-written to match supabase/migrations/0001_initial_schema.sql.
// Once you can run `supabase gen types typescript`, replace this file with
// the generated output and keep this shape as the contract.

export type CardStatus = "unassigned" | "active" | "suspended";
export type AppRole = "customer" | "admin";

export interface Database {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          card_code: string;
          status: CardStatus;
          batch_id: string | null;
          scan_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_code: string;
          status?: CardStatus;
          batch_id?: string | null;
          scan_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
      };
      businesses: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          business_name: string;
          target_url: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          business_name: string;
          target_url: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      batches: {
        Row: {
          id: string;
          label: string | null;
          card_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          label?: string | null;
          card_count: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["batches"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_card_redirect: {
        Args: { p_card_code: string };
        Returns: { card_status: CardStatus; redirect_url: string | null }[];
      };
      activate_card: {
        Args: {
          p_card_code: string;
          p_business_name: string;
          p_target_url: string;
        };
        Returns: string; // uuid of the created business's card_id
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      card_status: CardStatus;
      app_role: AppRole;
    };
  };
}
