CREATE TABLE public.pix_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_document text,
  pix_code text,
  paid_at timestamptz,
  order_bump boolean DEFAULT false,
  shipping_method text,
  variant text,
  quantity integer DEFAULT 1,
  utm text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.pix_transactions
  FOR ALL USING (true) WITH CHECK (true);