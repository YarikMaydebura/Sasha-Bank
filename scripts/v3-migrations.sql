
-- =====================================================
-- SASHA BANK V3.0 DATABASE MIGRATIONS
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tgdtsirkuvfzynqwjtmp/sql/new
-- =====================================================

-- 1. Add has_revived flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_revived BOOLEAN DEFAULT false;

-- 2. Add steal mission support and category to user_missions
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id);
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'main';

-- 3. Create steal_attempts table (Imposters System)
CREATE TABLE IF NOT EXISTS steal_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID REFERENCES users(id),
  victim_id UUID REFERENCES users(id),
  mission_id UUID REFERENCES user_missions(id),
  amount INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'dodged', 'blocked_shield')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create chain_progress table (Scavenger Hunt)
CREATE TABLE IF NOT EXISTS chain_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chain_id TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create hidden_qr_scans table
CREATE TABLE IF NOT EXISTS hidden_qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT,
  reward_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(qr_id, user_id)
);

-- 6. Create group_games table (Custom Games)
CREATE TABLE IF NOT EXISTS group_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  buy_in INTEGER NOT NULL,
  creator_id UUID REFERENCES users(id),
  pot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'started', 'finished')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create group_game_players table
CREATE TABLE IF NOT EXISTS group_game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES group_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- 8. Create market_missions table (Mission Marketplace)
CREATE TABLE IF NOT EXISTS market_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  description TEXT NOT NULL,
  reward INTEGER NOT NULL CHECK (reward >= 1 AND reward <= 10),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'completed', 'cancelled')),
  accepter_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 9. Enable Row Level Security on new tables
ALTER TABLE steal_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_missions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (allow all for simplicity in party app)
DROP POLICY IF EXISTS "Allow all" ON steal_attempts;
CREATE POLICY "Allow all" ON steal_attempts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON chain_progress;
CREATE POLICY "Allow all" ON chain_progress FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON hidden_qr_scans;
CREATE POLICY "Allow all" ON hidden_qr_scans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON group_games;
CREATE POLICY "Allow all" ON group_games FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON group_game_players;
CREATE POLICY "Allow all" ON group_game_players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON market_missions;
CREATE POLICY "Allow all" ON market_missions FOR ALL USING (true) WITH CHECK (true);

-- 11. Enable realtime on new tables (run separately if errors)
-- ALTER PUBLICATION supabase_realtime ADD TABLE steal_attempts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chain_progress;
-- ALTER PUBLICATION supabase_realtime ADD TABLE group_games;
-- ALTER PUBLICATION supabase_realtime ADD TABLE group_game_players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE market_missions;

-- =====================================================
-- V3.0 MIGRATIONS COMPLETE!
-- =====================================================
