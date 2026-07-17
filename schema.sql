-- StockSawa Supabase Schema
-- Copy and paste this into the Supabase SQL Editor

CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
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
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  "debtBalance" NUMERIC NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.deni_transactions (
  id TEXT PRIMARY KEY,
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
  "adminPin" TEXT,
  theme TEXT
);

-- Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deni_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access for this demo (since we aren't using auth yet)
-- Note: In production, you should restrict this using authenticated roles.
CREATE POLICY "Allow anonymous read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access" ON public.transactions FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access" ON public.customers FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access" ON public.deni_transactions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON public.deni_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.deni_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access" ON public.deni_transactions FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access" ON public.settings FOR DELETE USING (true);

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================

-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage objects already have RLS enabled by default in Supabase

-- Allow public read access to the product-images bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Allow anonymous uploads to the product-images bucket (for this demo)
CREATE POLICY "Public Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images');

-- Allow anonymous updates to the product-images bucket
CREATE POLICY "Public Updates" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images');

-- Allow anonymous deletes to the product-images bucket
CREATE POLICY "Public Deletes" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images');
