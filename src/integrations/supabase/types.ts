export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_mercado_pago_config: {
        Row: {
          access_token: string
          created_at: string
          id: string
          is_test_mode: boolean | null
          public_key: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          is_test_mode?: boolean | null
          public_key: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          is_test_mode?: boolean | null
          public_key?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      admin_stripe_config: {
        Row: {
          created_at: string | null
          id: number
          is_test_mode: boolean | null
          publishable_key: string
          secret_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_test_mode?: boolean | null
          publishable_key: string
          secret_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_test_mode?: boolean | null
          publishable_key?: string
          secret_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agendamentos: {
        Row: {
          cliente_email: string | null
          cliente_id: string | null
          created_at: string | null
          data_hora: string
          id: string
          observacoes: string | null
          profissional_id: string | null
          servico_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          valor: number | null
          valor_pago: number | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_hora: string
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number | null
          valor_pago?: number | null
        }
        Update: {
          cliente_email?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_hora?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string
          data_inicio: string
          data_vencimento: string
          id: string
          payment_id: string | null
          preco: number
          preference_id: string | null
          status: string
          stripe_subscription_id: string | null
          trial_ate: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string
          data_vencimento: string
          id?: string
          payment_id?: string | null
          preco?: number
          preference_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ate?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string
          data_vencimento?: string
          id?: string
          payment_id?: string | null
          preco?: number
          preference_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ate?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          agendamento_id: string | null
          cliente_id: string
          comentario: string | null
          created_at: string
          id: string
          nota: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento_id?: string | null
          cliente_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento_id?: string | null
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_closed_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          profissional_id: string | null
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          profissional_id?: string | null
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          profissional_id?: string | null
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_closed_time_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          profissional_id: string | null
          reason: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          profissional_id?: string | null
          reason?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          profissional_id?: string | null
          reason?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_settings: {
        Row: {
          antecedencia_minima: number | null
          created_at: string | null
          dias_funcionamento: string[] | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          intervalo_agendamento: number | null
          profissional_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          antecedencia_minima?: number | null
          created_at?: string | null
          dias_funcionamento?: string[] | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          profissional_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          antecedencia_minima?: number | null
          created_at?: string | null
          dias_funcionamento?: string[] | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          profissional_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cliente_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string
          profissional_vinculado: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          profissional_vinculado?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          profissional_vinculado?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente_profissional_associations: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          profissional_id: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          profissional_id: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          profissional_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          antecedencia_minima: number | null
          cep: string | null
          cidade: string | null
          created_at: string | null
          dias_funcionamento: string[] | null
          endereco: string | null
          foto_estabelecimento_url: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          intervalo_agendamento: number | null
          mensagem_confirmacao: string | null
          mercado_pago_access_token: string | null
          mercado_pago_public_key: string | null
          nome_estabelecimento: string | null
          percentual_antecipado: number | null
          telefone_estabelecimento: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          antecedencia_minima?: number | null
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          dias_funcionamento?: string[] | null
          endereco?: string | null
          foto_estabelecimento_url?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          mensagem_confirmacao?: string | null
          mercado_pago_access_token?: string | null
          mercado_pago_public_key?: string | null
          nome_estabelecimento?: string | null
          percentual_antecipado?: number | null
          telefone_estabelecimento?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          antecedencia_minima?: number | null
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          dias_funcionamento?: string[] | null
          endereco?: string | null
          foto_estabelecimento_url?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          mensagem_confirmacao?: string | null
          mercado_pago_access_token?: string | null
          mercado_pago_public_key?: string | null
          nome_estabelecimento?: string | null
          percentual_antecipado?: number | null
          telefone_estabelecimento?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          agendamento_id: string | null
          created_at: string
          expires_at: string
          id: string
          percentual: number
          pix_code: string | null
          pix_qr_code: string | null
          preference_id: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          percentual?: number
          pix_code?: string | null
          pix_qr_code?: string | null
          preference_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          percentual?: number
          pix_code?: string | null
          pix_qr_code?: string | null
          preference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: true
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
          tipo_usuario: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nome: string
          tipo_usuario?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          tipo_usuario?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          especialidade: string | null
          foto_url: string | null
          id: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profissional_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          empresa: string
          empresa_slug: string | null
          foto_salao_url: string | null
          id: string
          nome: string
          telefone: string | null
          tipo_usuario: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          empresa: string
          empresa_slug?: string | null
          foto_salao_url?: string | null
          id: string
          nome: string
          telefone?: string | null
          tipo_usuario?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          empresa?: string
          empresa_slug?: string | null
          foto_salao_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo_usuario?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salao_fotos: {
        Row: {
          created_at: string | null
          descricao: string | null
          foto_url: string
          id: string
          ordem: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          foto_url: string
          id?: string
          ordem?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          foto_url?: string
          id?: string
          ordem?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          duracao: number
          id: string
          nome: string
          preco: number | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao: number
          id?: string
          nome: string
          preco?: number | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao?: number
          id?: string
          nome?: string
          preco?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_client_associations: {
        Args: { client_user_id: string }
        Returns: {
          cliente_id: string
          profissional_vinculado: string
          association_exists: boolean
          association_count: number
        }[]
      }
      delete_professional_safely: {
        Args: { professional_id: string }
        Returns: boolean
      }
      generate_company_slug: {
        Args: { company_name: string }
        Returns: string
      }
      get_all_assinaturas: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          data_inicio: string
          data_vencimento: string
          id: string
          payment_id: string | null
          preco: number
          preference_id: string | null
          status: string
          stripe_subscription_id: string | null
          trial_ate: string
          updated_at: string
          user_id: string
        }[]
      }
      get_all_pagamentos: {
        Args: Record<PropertyKey, never>
        Returns: {
          agendamento_id: string | null
          created_at: string
          expires_at: string
          id: string
          percentual: number
          pix_code: string | null
          pix_qr_code: string | null
          preference_id: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }[]
      }
      get_all_professionals: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          empresa: string
          empresa_slug: string | null
          foto_salao_url: string | null
          id: string
          nome: string
          telefone: string | null
          tipo_usuario: string | null
          updated_at: string | null
        }[]
      }
      get_associated_clients: {
        Args: { professional_user_id: string }
        Returns: {
          id: string
          nome: string
          email: string
          telefone: string
          created_at: string
          updated_at: string
          association_date: string
        }[]
      }
      get_current_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_professional_by_slug: {
        Args: { slug: string }
        Returns: string
      }
      get_professional_clients: {
        Args: { professional_user_id: string }
        Returns: {
          id: string
          nome: string
          email: string
          telefone: string
          created_at: string
          updated_at: string
          total_agendamentos: number
        }[]
      }
      get_user_type_from_metadata: {
        Args: { user_metadata: Json }
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_establishment_active: {
        Args: { owner_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_type: "admin" | "profissional" | "cliente"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      user_type: ["admin", "profissional", "cliente"],
    },
  },
} as const
