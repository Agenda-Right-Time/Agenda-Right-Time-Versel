
export interface Subscription {
  id: string;
  status: 'trial' | 'ativa' | 'suspensa' | 'cancelada';
  preco: number;
  data_inicio: string;
  data_vencimento: string;
  trial_ate: string;
  payment_id?: string | null;
  preference_id?: string | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  valor: number;
  percentual: number;
  status: 'pendente' | 'cancelado' | 'aprovado' | 'rejeitado';
  pix_code?: string | null;
  pix_qr_code?: string | null;
  created_at: string;
  expires_at: string;
  agendamento_id?: string | null;
  user_id: string;
  updated_at?: string;
  agendamentos?: {
    data_hora: string;
    servicos?: { nome: string };
    clientes?: { nome: string; telefone?: string };
  } | null;
}

export interface Appointment {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  valor_pago: number;
  observacoes?: string | null;
  servico_id?: string | null;
  cliente_email?: string | null;
  profissional_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  servicos?: { nome: string; preco: number; duracao: number };
  profissionais?: { nome: string };
  pagamentos?: Array<{ status: string; valor: number }>;
  isPacoteMensal?: boolean;
  displayStatus?: string;
  pacoteInfo?: {
    sequencia: number;
    pacoteId: string;
  };
}

export interface AdminSubscription extends Subscription {
  statusCalculado: string;
  profiles: { nome: string; email: string };
}

export interface AdminPayment extends Payment {
  profiles: { nome: string; email: string };
  agendamentos?: {
    data_hora: string;
    servicos?: { nome: string };
  } | null;
}
