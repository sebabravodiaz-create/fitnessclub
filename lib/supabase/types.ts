export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type GenericView = {
  Row: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type GenericFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

type AnyTable = GenericTable;

type AnyView = {
  Row: Record<string, unknown>;
  Relationships: GenericRelationship[];
};

type AnyFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

type AppSettingsTable = Omit<GenericTable, 'Row' | 'Insert' | 'Update'> & {
  Row: {
    key: string;
    value: Json | null;
    updated_at: string;
  };
  Insert: {
    key: string;
    value: Json | null;
    updated_at?: string;
  };
  Update: {
    key?: string;
    value?: Json | null;
    updated_at?: string;
  };
};

export type Database = {
  public: {
    Tables: {
      app_settings: AppSettingsTable;
      athletes: AnyTable;
      cards: AnyTable;
      memberships: AnyTable;
      access_logs: AnyTable;
      routines: AnyTable;
      routine_assignments: AnyTable;
      [key: string]: AnyTable;
    };
    Views: Record<string, AnyView>;
    Functions: Record<string, AnyFunction>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};
