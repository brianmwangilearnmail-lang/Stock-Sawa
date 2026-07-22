-- StockSawa Supabase Schema (Multi-user Isolated)
-- Matches the app's exact TypeScript types to prevent sync failures.
-- Copy and paste this into the Supabase SQL Editor to reset the tables.

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.deni_transactions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- ========================================================
-- PRODUCTS
-- Matches: { id, name, sku, quantity, sellingPrice, costPrice, imageUrl, createdAt }
-- ========================================================
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  "sellingPrice" NUMERIC NOT NULL DEFAULT 0,
  "costPrice" NUMERIC NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- TRANSACTIONS
-- Matches: { id, productId, staffPinUsed, quantityChanged, reasonCategory, customReason, createdAt, syncStatus }
-- ========================================================
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "productId" TEXT NOT NULL,
  "staffPinUsed" TEXT,
  "quantityChanged" INTEGER NOT NULL,
  "reasonCategory" TEXT NOT NULL,
  "customReason" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "syncStatus" TEXT DEFAULT 'synced'
);

-- ========================================================
-- CUSTOMERS
-- Matches: { id, name, phone, debtBalance, createdAt }
-- ========================================================
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  phone TEXT,
  "debtBalance" NUMERIC NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- DENI TRANSACTIONS
-- Matches: { id, customerId, productId, amount, type, notes, createdAt, syncStatus }
-- ========================================================
CREATE TABLE public.deni_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "syncStatus" TEXT DEFAULT 'synced'
);

-- ========================================================
-- SETTINGS
-- Matches: { id, adminPin, theme }
-- ========================================================
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "adminPin" TEXT,
  theme TEXT
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deni_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS POLICIES (Each user sees and edits ONLY their own rows)
-- ========================================================
CREATE POLICY "Owner can select" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.products FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owner can select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owner can select" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.customers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owner can select" ON public.deni_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert" ON public.deni_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.deni_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.deni_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owner can select" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ========================================================
-- REALTIME CONFIGURATION
-- ========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deni_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
