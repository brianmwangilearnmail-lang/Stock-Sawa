-- StockSawa Supabase Schema (Multi-user Isolated)
-- Copy and paste this into the Supabase SQL Editor to reset the tables and enable individual account data isolation.

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.deni_transactions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Create tables with user_id mapping
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  "sellingPrice" NUMERIC NOT NULL DEFAULT 0,
  "costPrice" NUMERIC NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  phone TEXT,
  "debtBalance" NUMERIC NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.deni_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "customerId" TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  "productId" TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "syncStatus" TEXT DEFAULT 'synced'
);

CREATE TABLE public.settings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  "adminPin" TEXT,
  theme TEXT
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deni_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Strictly limit to the authenticated owner)
CREATE POLICY "Allow authenticated owner read" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner update" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner delete" ON public.products FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated owner read" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated owner read" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner insert" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner update" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner delete" ON public.customers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated owner read" ON public.deni_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner insert" ON public.deni_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner update" ON public.deni_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner delete" ON public.deni_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated owner read" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner insert" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner update" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated owner delete" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================

-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Updates" ON storage.objects;
DROP POLICY IF EXISTS "Public Deletes" ON storage.objects;

-- Allow public read access to the product-images bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Allow authenticated uploads to the product-images bucket
CREATE POLICY "Authenticated Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow authenticated updates to the product-images bucket
CREATE POLICY "Authenticated Updates" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow authenticated deletes to the product-images bucket
CREATE POLICY "Authenticated Deletes" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
