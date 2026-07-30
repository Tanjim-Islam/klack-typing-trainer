/**
 * Hand-written types for the schema in `supabase/migrations/0001_init.sql`.
 *
 * Kept in the repo rather than generated on demand so a clone type-checks
 * without database access. If the migration changes, change this too; the
 * generated equivalent is `npx supabase gen types typescript`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: "system" | "light" | "dark";
          accent: "teal" | "amber" | "cobalt";
          motion: "system" | "reduced";
          default_mode: "time" | "words" | "quote" | "code" | "drill";
          duration: number;
          word_count: number;
          punctuation: boolean;
          numbers: boolean;
          stop_on_error: boolean;
          show_live_stats: boolean;
          caret: "block" | "line" | "underline";
          text_size: "md" | "lg";
          sound: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["user_settings"]["Row"], "user_id">> & {
          user_id: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["user_settings"]["Row"], "user_id">>;
        Relationships: [];
      };
      test_results: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          taken_at: string;
          mode: "time" | "words" | "quote" | "code" | "drill";
          label: string;
          elapsed_ms: number;
          wpm: number;
          raw_wpm: number;
          accuracy: number;
          consistency: number;
          correct_chars: number;
          incorrect_chars: number;
          keystrokes: number;
          correct_keystrokes: number;
          words: number;
          samples: number[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["test_results"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["test_results"]["Insert"]>;
        Relationships: [];
      };
      result_key_stats: {
        Row: {
          result_id: string;
          user_id: string;
          char: string;
          hits: number;
          misses: number;
        };
        Insert: Database["public"]["Tables"]["result_key_stats"]["Row"];
        Update: Partial<Database["public"]["Tables"]["result_key_stats"]["Row"]>;
        Relationships: [];
      };
      drills: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          name: string;
          description: string;
          text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          name: string;
          description?: string;
          text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["drills"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      user_key_stats: {
        Row: {
          user_id: string;
          char: string;
          hits: number;
          misses: number;
          attempts: number;
          accuracy: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      save_test_results: {
        Args: { p_results: Json };
        Returns: string[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
