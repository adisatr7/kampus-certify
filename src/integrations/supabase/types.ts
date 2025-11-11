export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      audit_trail: {
        Row: {
          action: string;
          created_at: string | null;
          description: string | null;
          id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_trail_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      certificate_signatures: {
        Row: {
          certificate_id: string;
          id: string;
          key_id: string;
          payload_hash: string;
          signature: string;
          signed_at: string | null;
          signer_user_id: string | null;
        };
        Insert: {
          certificate_id: string;
          id?: string;
          key_id: string;
          payload_hash: string;
          signature: string;
          signed_at?: string | null;
          signer_user_id?: string | null;
        };
        Update: {
          certificate_id?: string;
          id?: string;
          key_id?: string;
          payload_hash?: string;
          signature?: string;
          signed_at?: string | null;
          signer_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificate_signatures_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificate_verification";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificate_signatures_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificate_signatures_key_id_fkey";
            columns: ["key_id"];
            isOneToOne: false;
            referencedRelation: "signing_keys";
            referencedColumns: ["kid"];
          },
        ];
      };
      certificates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string | null;
          expires_at: string;
          id: string;
          issued_at: string | null;
          payload: Json | null;
          rejected_at: string | null;
          rejected_by: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          serial_number: string;
          status: Database["public"]["Enums"]["certificate_status"] | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          expires_at: string;
          id?: string;
          issued_at?: string | null;
          payload?: Json | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          serial_number: string;
          status?: Database["public"]["Enums"]["certificate_status"] | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          issued_at?: string | null;
          payload?: Json | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          serial_number?: string;
          status?: Database["public"]["Enums"]["certificate_status"] | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      device_nonces: {
        Row: {
          created_at: string | null;
          device_id: string;
          expires_at: string;
          id: string;
          nonce: string;
          used: boolean | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_id: string;
          expires_at: string;
          id?: string;
          nonce: string;
          used?: boolean | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          device_id?: string;
          expires_at?: string;
          id?: string;
          nonce?: string;
          used?: boolean | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_nonces_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "user_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      document_signatures: {
        Row: {
          document_id: string;
          id: string;
          key_id: string;
          payload_hash: string;
          signature: string;
          signed_at: string | null;
          signer_user_id: string | null;
        };
        Insert: {
          document_id: string;
          id?: string;
          key_id: string;
          payload_hash: string;
          signature: string;
          signed_at?: string | null;
          signer_user_id?: string | null;
        };
        Update: {
          document_id?: string;
          id?: string;
          key_id?: string;
          payload_hash?: string;
          signature?: string;
          signed_at?: string | null;
          signer_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_signatures_key_id_fkey";
            columns: ["key_id"];
            isOneToOne: false;
            referencedRelation: "signing_keys";
            referencedColumns: ["kid"];
          },
        ];
      };
      documents: {
        Row: {
          certificate_id: string | null;
          content: string | null;
          created_at: string | null;
          file_url: string | null;
          id: string;
          qr_code_url: string | null;
          status: Database["public"]["Enums"]["document_status"] | null;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          certificate_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          file_url?: string | null;
          id?: string;
          qr_code_url?: string | null;
          status?: Database["public"]["Enums"]["document_status"] | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          certificate_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          file_url?: string | null;
          id?: string;
          qr_code_url?: string | null;
          status?: Database["public"]["Enums"]["document_status"] | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificate_verification";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      signing_keys: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          crv: string | null;
          e: string | null;
          kid: string;
          kty: string;
          n: string | null;
          x: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          crv?: string | null;
          e?: string | null;
          kid: string;
          kty: string;
          n?: string | null;
          x?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          crv?: string | null;
          e?: string | null;
          kid?: string;
          kty?: string;
          n?: string | null;
          x?: string | null;
        };
        Relationships: [];
      };
      user_devices: {
        Row: {
          created_at: string | null;
          device_name: string;
          id: string;
          public_key_jwk: Json;
          revoked: boolean | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_name: string;
          id?: string;
          public_key_jwk: Json;
          revoked?: boolean | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          device_name?: string;
          id?: string;
          public_key_jwk?: Json;
          revoked?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          nidn: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          name: string;
          nidn?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          nidn?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      certificate_verification: {
        Row: {
          expires_at: string | null;
          id: string | null;
          issued_at: string | null;
          serial_number: string | null;
          status: Database["public"]["Enums"]["certificate_status"] | null;
        };
        Insert: {
          expires_at?: string | null;
          id?: string | null;
          issued_at?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["certificate_status"] | null;
        };
        Update: {
          expires_at?: string | null;
          id?: string | null;
          issued_at?: string | null;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["certificate_status"] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_audit_entry: {
        Args: { p_action: string; p_description: string; p_user_id: string };
        Returns: undefined;
      };
      get_certificate_for_signing: {
        Args: { cert_id: string };
        Returns: {
          can_sign: boolean;
          certificate_id: string;
        }[];
      };
      get_safe_certificate_data: {
        Args: { cert_id: string };
        Returns: {
          created_at: string;
          expires_at: string;
          id: string;
          issued_at: string;
          public_key: string;
          revoked_at: string;
          serial_number: string;
          status: Database["public"]["Enums"]["certificate_status"];
          updated_at: string;
          user_id: string;
        }[];
      };
      get_user_role: {
        Args: { user_uuid: string };
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      verify_document: {
        Args: { doc_id: string };
        Returns: {
          certificate_serial: string;
          id: string;
          qr_code_url: string;
          signed_at: string;
          signed_document_url: string;
          status: Database["public"]["Enums"]["document_status"];
          title: string;
        }[];
      };
    };
    Enums: {
      certificate_status: "active" | "expired" | "revoked";
      document_status: "pending" | "signed" | "revoked";
      user_role: "admin" | "dosen" | "rektor" | "dekan";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      certificate_status: ["active", "expired", "revoked"],
      document_status: ["pending", "signed", "revoked"],
      user_role: ["admin", "dosen", "rektor", "dekan"],
    },
  },
} as const;
