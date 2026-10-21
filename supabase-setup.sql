-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/dnwitnnzrkcismsbxfcg/sql/new)
CREATE TABLE IF NOT EXISTS guild_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  price_gold INTEGER DEFAULT 0,
  price_silver INTEGER DEFAULT 0,
  price_iron INTEGER DEFAULT 0,
  price_med INTEGER DEFAULT 0,
  amount_needed INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_hot BOOLEAN DEFAULT false,
  is_crafting BOOLEAN DEFAULT false,
  is_cooking BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guild_items ENABLE ROW LEVEL SECURITY;

-- Read-only for the public app. This table is shop content written only by
-- admins, so the page never needs write access to it. Earlier versions used
-- "FOR ALL", which let anyone with the URL rewrite guild prices.
DROP POLICY IF EXISTS "Allow all" ON guild_items;
CREATE POLICY "Public read" ON guild_items FOR SELECT USING (true);
