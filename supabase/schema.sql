-- Sasha Bank Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  balance INTEGER DEFAULT 10 CHECK (balance >= 1),
  is_admin BOOLEAN DEFAULT false,
  qr_code TEXT UNIQUE,
  has_immunity BOOLEAN DEFAULT false,
  immunity_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mission templates
CREATE TABLE IF NOT EXISTS mission_templates (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  is_personalized BOOLEAN DEFAULT false,
  difficulty TEXT CHECK (difficulty IN ('easy', 'fun', 'bold')),
  reward INTEGER DEFAULT 1,
  verification TEXT CHECK (verification IN ('honor', 'witness', 'target')),
  category TEXT
);

-- User missions (assigned to specific users)
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES mission_templates(id),
  target_user_id UUID REFERENCES users(id),
  generated_text TEXT,
  reward INTEGER DEFAULT 1,
  difficulty TEXT,
  verification TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'pending', 'completed', 'declined')),
  proof_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bar orders
CREATE TABLE IF NOT EXISTS bar_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  drink_id TEXT NOT NULL,
  drink_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'served', 'cancelled')),
  order_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  served_at TIMESTAMP WITH TIME ZONE
);

-- Lottery tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  prize_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trivia questions
CREATE TABLE IF NOT EXISTS trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  category TEXT,
  difficulty TEXT
);

-- Box rounds
CREATE TABLE IF NOT EXISTS box_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'bidding', 'ended')),
  winner_id UUID REFERENCES users(id),
  winning_bid INTEGER,
  content_type TEXT,
  content_text TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Box bids
CREATE TABLE IF NOT EXISTS box_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES box_rounds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

-- Risk cards (can be seeded with data)
CREATE TABLE IF NOT EXISTS risk_cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  effect TEXT NOT NULL,
  display_text TEXT NOT NULL,
  coin_change INTEGER DEFAULT 0,
  emoji TEXT,
  probability DECIMAL(5,4) NOT NULL,
  can_drink_cancel BOOLEAN DEFAULT false,
  special TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bar_orders_status ON bar_orders(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_box_bids_round ON box_bids(round_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_cards ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - this is a party app, not production)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for mission_templates" ON mission_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for user_missions" ON user_missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for bar_orders" ON bar_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for lottery_tickets" ON lottery_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for trivia_questions" ON trivia_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for box_rounds" ON box_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for box_bids" ON box_bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for risk_cards" ON risk_cards FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE bar_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE box_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE box_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE user_missions;
