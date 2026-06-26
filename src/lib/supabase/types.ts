// Hand-authored to match supabase/migrations. In normal operation this file is
// regenerated from the live schema via the Supabase MCP (generate_typescript_types)
// after every migration — see AGENTS.md. Keep it in sync if you edit by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Shape returned by check_in() / check_in_by_coords(): the group-mates found
// in the same city right now.
type MatchPartner = {
  other_member_id: string;
  other_display_name: string;
  other_pin_emoji: string;
  group_id: string;
  group_name: string;
  city_name: string;
};

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          auth_user_id: string;
          display_name: string;
          pin_emoji: string;
          status_text: string | null;
          status_emoji: string | null;
          ghost_mode: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          display_name: string;
          pin_emoji?: string;
          status_text?: string | null;
          status_emoji?: string | null;
          ghost_mode?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          display_name?: string;
          pin_emoji?: string;
          status_text?: string | null;
          status_emoji?: string | null;
          ghost_mode?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          member_id: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          group_id: string;
          member_id: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          group_id?: string;
          member_id?: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          country_code: string;
          lat: number;
          lng: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          country_code: string;
          lat: number;
          lng: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          country_code?: string;
          lat?: number;
          lng?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      presence_events: {
        Row: {
          id: string;
          member_id: string;
          city_id: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          city_id?: string | null;
          source: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          city_id?: string | null;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "presence_events_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presence_events_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      match_events: {
        Row: {
          id: string;
          group_id: string;
          city_id: string;
          member_a: string;
          member_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          city_id: string;
          member_a: string;
          member_b: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          city_id?: string;
          member_a?: string;
          member_b?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      live_presence: {
        Row: {
          member_id: string | null;
          display_name: string | null;
          pin_emoji: string | null;
          status_text: string | null;
          status_emoji: string | null;
          city_id: string | null;
          city_name: string | null;
          country_code: string | null;
          lat: number | null;
          lng: number | null;
          since: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      save_profile: {
        Args: { p_display_name: string; p_pin_emoji?: string };
        Returns: string;
      };
      set_status: {
        Args: { p_status_text: string; p_status_emoji: string };
        Returns: undefined;
      };
      set_ghost: { Args: { p_ghost: boolean }; Returns: undefined };
      create_group: { Args: { p_name: string }; Returns: string };
      join_group: { Args: { p_code: string }; Returns: string };
      leave_group: { Args: { p_group_id: string }; Returns: undefined };
      clear_presence: { Args: Record<string, never>; Returns: undefined };
      check_in: {
        Args: { p_city_id: string; p_source?: string };
        Returns: MatchPartner[];
      };
      check_in_by_coords: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_city_name: string;
          p_country_code: string;
        };
        Returns: MatchPartner[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
