export type Role = 'ADMINISTRADOR' | 'NIVEL_2' | 'NIVEL_3';

export type QuoteStatus =
  | 'CREADO'
  | 'APROBADO'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'CERRADO'
  | 'RECHAZADO';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export interface Profile {
  id: string;
  user_code: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Operario {
  id: string;
  user_code: string;
  full_name: string;
}

export interface Client {
  id: string;
  doc_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  wholesale_price: number | null;
  observation: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Quote {
  id: string;
  correlative: string;
  client_id: string | null;
  status: QuoteStatus;
  subtotal_sin_iva: number;
  iva_total: number;
  subtotal_con_iva: number;
  retencion_renta: number;
  discount: number;
  total: number;
  product_link: string | null;
  reference_image_url: string | null;
  notes: string | null;
  external_invoice_number: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  quantity: number;
  detail: string;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  id: string;
  quote_id: string;
  amount: number;
  payment_method: PaymentMethod;
  observation: string | null;
  created_by: string;
  created_at: string;
  profile?: Operario | null;
}

export interface QuoteWithRelations extends Quote {
  client: Client | null;
  items: QuoteItem[];
  payments: Payment[];
  assigned: Operario | null;
  creator: Operario | null;
}
