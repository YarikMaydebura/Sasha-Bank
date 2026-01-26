-- ============================================
-- SASHA BANK V2 DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- SAFE TO RE-RUN: Uses IF NOT EXISTS checks
-- ============================================

-- ============================================
-- 1. UPDATE EXISTING USERS TABLE
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'guest'
  CHECK (role IN ('guest', 'bartender', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_drinks_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_double_reward BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_immunity_shield BOOLEAN DEFAULT false;

-- Set default admins
UPDATE users SET role = 'admin' WHERE name IN ('Yarik', 'Sasha');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. RISK SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS risk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'completed', 'declined')),
  card_id VARCHAR(50),
  card_result JSONB,
  declined_action VARCHAR(20) CHECK (declined_action IN ('drink', 'coins', null)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_sessions_user ON risk_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_sessions_status ON risk_sessions(status);
CREATE INDEX IF NOT EXISTS idx_risk_sessions_created ON risk_sessions(created_at DESC);

-- ============================================
-- 3. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'gift_received',
    'punishment_assigned',
    'mission_confirmed',
    'favor_fulfilled',
    'ability_used',
    'trade_request',
    'risk_result',
    'admin_message',
    'system'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 4. USER ABILITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ability_id VARCHAR(50) NOT NULL CHECK (ability_id IN (
    'skip_punishment',
    'choose_song',
    'immunity_shield',
    'double_reward'
  )),
  status VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned', 'used', 'expired')),
  used_on_user_id UUID REFERENCES users(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_abilities_user ON user_abilities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_abilities_status ON user_abilities(user_id, status);

-- ============================================
-- 5. PURCHASED FAVORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS purchased_favors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  favor_id VARCHAR(50) NOT NULL CHECK (favor_id IN (
    'hug',
    'photo',
    'dance',
    'compliment',
    'toast',
    'song_dedication'
  )),
  favor_name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  message TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchased_favors_user ON purchased_favors(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_favors_status ON purchased_favors(status);

-- ============================================
-- 6. ASSIGNED PUNISHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS assigned_punishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  punishment_id VARCHAR(50),
  punishment_text TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('market', 'risk_decline', 'box', 'admin')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'expired')),
  coins_to_skip INTEGER DEFAULT 1,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assigned_punishments_to_user ON assigned_punishments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_assigned_punishments_status ON assigned_punishments(status);
CREATE INDEX IF NOT EXISTS idx_assigned_punishments_pending ON assigned_punishments(to_user_id, status) WHERE status = 'pending';

-- ============================================
-- 7. GIFT DRINKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gift_drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  drink_id VARCHAR(50) NOT NULL,
  drink_name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL,
  order_code VARCHAR(10) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'served', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  served_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gift_drinks_from ON gift_drinks(from_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_drinks_to ON gift_drinks(to_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_drinks_status ON gift_drinks(status);

-- ============================================
-- 8. SONG REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ability_id UUID REFERENCES user_abilities(id) ON DELETE SET NULL,
  song_title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'played', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  played_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_song_requests_user ON song_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE risk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchased_favors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all" ON risk_sessions;
DROP POLICY IF EXISTS "Allow all" ON notifications;
DROP POLICY IF EXISTS "Allow all" ON user_abilities;
DROP POLICY IF EXISTS "Allow all" ON purchased_favors;
DROP POLICY IF EXISTS "Allow all" ON assigned_punishments;
DROP POLICY IF EXISTS "Allow all" ON gift_drinks;
DROP POLICY IF EXISTS "Allow all" ON song_requests;

-- Allow all for simplicity (party app)
CREATE POLICY "Allow all" ON risk_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON user_abilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchased_favors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON assigned_punishments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON gift_drinks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON song_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 10. REALTIME SUBSCRIPTIONS
-- ============================================

-- Add tables to realtime publication (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE risk_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_abilities;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE assigned_punishments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gift_drinks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign punishment with deadline
CREATE OR REPLACE FUNCTION assign_punishment(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_punishment_text TEXT,
  p_source VARCHAR,
  p_punishment_id VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_punishment_id UUID;
  v_deadline TIMESTAMPTZ;
BEGIN
  v_deadline := NOW() + INTERVAL '30 minutes';

  INSERT INTO assigned_punishments (
    from_user_id,
    to_user_id,
    punishment_id,
    punishment_text,
    source,
    deadline,
    status
  ) VALUES (
    p_from_user_id,
    p_to_user_id,
    p_punishment_id,
    p_punishment_text,
    p_source,
    v_deadline,
    'pending'
  ) RETURNING id INTO v_punishment_id;

  PERFORM create_notification(
    p_to_user_id,
    'punishment_assigned',
    '😈 New Punishment!',
    p_punishment_text,
    jsonb_build_object(
      'punishment_id', v_punishment_id,
      'from_user_id', p_from_user_id,
      'deadline', v_deadline
    )
  );

  RETURN v_punishment_id;
END;
$$ LANGUAGE plpgsql;
