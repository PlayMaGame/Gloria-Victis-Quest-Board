CREATE TABLE IF NOT EXISTS shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  discord_id TEXT DEFAULT '',
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  discord_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ
);

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access" ON shop_purchases FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE shop_purchases;
