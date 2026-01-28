-- ============================================
-- Sasha Bank v2.0 - Phase 1 Schema Changes
-- ============================================
--
-- Run this in Supabase SQL Editor AFTER completing backups
-- Creates new tables for Cards, Poker, Photos, and Traits systems
--
-- Date: 2026-01-28
-- Duration: 2-3 hours
--

-- ============================================
-- 1. CARDS SYSTEM TABLES
-- ============================================

-- Cards that users own (won from Risk, missions, lottery, or purchased)
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  card_id VARCHAR(50) NOT NULL,
  card_name VARCHAR(100) NOT NULL,
  card_emoji VARCHAR(10),
  description TEXT,
  rarity VARCHAR(20) CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  status VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned', 'used', 'traded')),
  obtained_from VARCHAR(30) CHECK (obtained_from IN ('risk', 'mission', 'lottery', 'purchase', 'admin')),
  used_on_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_user_cards_user ON user_cards(user_id);
CREATE INDEX idx_user_cards_status ON user_cards(status);
CREATE INDEX idx_user_cards_created ON user_cards(created_at DESC);

-- Card usage logs for admin notifications
CREATE TABLE IF NOT EXISTS card_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id VARCHAR(50) NOT NULL,
  card_name VARCHAR(100),
  target_user_id UUID REFERENCES users(id),
  target_user_name VARCHAR(100),
  effect_description TEXT,
  admin_notified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_usage_logs_created ON card_usage_logs(created_at DESC);
CREATE INDEX idx_card_usage_logs_user ON card_usage_logs(user_id);

-- ============================================
-- 2. POKER SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS poker_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked', 'playing', 'ended')),
  pot_total INTEGER DEFAULT 0,
  min_buy_in INTEGER DEFAULT 3,
  max_players INTEGER DEFAULT 10,
  winners JSONB DEFAULT '[]'::jsonb,
  winner_ids UUID[],
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poker_rounds_status ON poker_rounds(status);
CREATE INDEX idx_poker_rounds_created ON poker_rounds(created_at DESC);

CREATE TABLE IF NOT EXISTS poker_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES poker_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_name VARCHAR(100),
  chips_in INTEGER NOT NULL CHECK (chips_in > 0),
  status VARCHAR(20) DEFAULT 'playing' CHECK (status IN ('playing', 'folded', 'winner', 'loser')),
  winnings INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

CREATE INDEX idx_poker_players_round ON poker_players(round_id);
CREATE INDEX idx_poker_players_user ON poker_players(user_id);

-- ============================================
-- 3. PHOTO PROMPT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_name VARCHAR(100),
  prompt_id VARCHAR(50) NOT NULL,
  prompt_text TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  reward_claimed BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_created ON photos(created_at DESC);
CREATE INDEX idx_photos_status ON photos(status);

-- ============================================
-- 4. TRAIT-BASED MISSIONS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS guest_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trait_category VARCHAR(50) NOT NULL CHECK (trait_category IN (
    'social_butterfly',
    'quiet_observer',
    'party_starter',
    'photographer',
    'dancer',
    'funny_person',
    'helper',
    'adventurer'
  )),
  trait_emoji VARCHAR(10),
  trait_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guest_traits_category ON guest_traits(trait_category);
CREATE INDEX idx_guest_traits_user ON guest_traits(user_id);

-- ============================================
-- 5. MODIFY EXISTING TABLES
-- ============================================

-- Add trait support and confirmation to missions
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS trait_category VARCHAR(50);
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN DEFAULT false;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS confirmed_by_user_id UUID REFERENCES users(id);
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS confirmed_by_user_name VARCHAR(100);
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add verification field if missing (critical bug fix)
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS verification VARCHAR(20) DEFAULT 'honor';

CREATE INDEX IF NOT EXISTS idx_user_missions_trait ON user_missions(trait_category);
CREATE INDEX IF NOT EXISTS idx_user_missions_verification ON user_missions(verification);

-- Add card rewards to risk sessions
ALTER TABLE risk_sessions ADD COLUMN IF NOT EXISTS card_reward_id VARCHAR(50);
ALTER TABLE risk_sessions ADD COLUMN IF NOT EXISTS card_reward_name VARCHAR(100);
ALTER TABLE risk_sessions ADD COLUMN IF NOT EXISTS card_reward_rarity VARCHAR(20);

-- Update lottery for end-of-party draw
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS winning_item VARCHAR(100);
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS prize_type VARCHAR(30) CHECK (prize_type IN ('coins', 'card', 'punishment', 'physical'));
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS prize_value JSONB;
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS draw_position INTEGER;
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMPTZ;

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_traits ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (party app - trust all authenticated users)
CREATE POLICY "Allow all authenticated" ON user_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON card_usage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON poker_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON poker_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON guest_traits FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. ENABLE REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE card_usage_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE poker_players;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE guest_traits;

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================

-- Verify all tables created
SELECT
  table_name,
  'Created' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_cards',
    'card_usage_logs',
    'poker_rounds',
    'poker_players',
    'photos',
    'guest_traits'
  )
ORDER BY table_name;

-- Verify columns added to existing tables
SELECT
  column_name,
  data_type,
  'Added to user_missions' as table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_missions'
  AND column_name IN ('trait_category', 'requires_confirmation', 'verification', 'confirmed_by_user_id', 'confirmed_at');

SELECT
  column_name,
  data_type,
  'Added to risk_sessions' as table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'risk_sessions'
  AND column_name IN ('card_reward_id', 'card_reward_name', 'card_reward_rarity');

SELECT
  column_name,
  data_type,
  'Added to lottery_tickets' as table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lottery_tickets'
  AND column_name IN ('winning_item', 'prize_type', 'prize_value', 'draw_position', 'drawn_at');

-- Success message
SELECT '✅ Phase 1 schema changes completed successfully!' as status;
SELECT '📝 Next: Run Phase 2 - Delete deprecated files' as next_step;
