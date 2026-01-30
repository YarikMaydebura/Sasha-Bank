-- =============================================
-- SASHA BANK V3.0 - COMPLETE DATABASE MIGRATION
-- =============================================
-- Run this in Supabase SQL Editor
-- This migration handles existing tables/columns gracefully
-- =============================================

-- =============================================
-- 1. ADD COLUMNS IF NOT EXISTS
-- =============================================

-- Add has_revived column to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'has_revived'
    ) THEN
        ALTER TABLE users ADD COLUMN has_revived BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add ready column to group_game_players
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'group_game_players' AND column_name = 'ready'
    ) THEN
        ALTER TABLE group_game_players ADD COLUMN ready BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =============================================
-- 2. CREATE POKER TABLES IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS poker_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_buy_in INTEGER NOT NULL DEFAULT 3,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pot INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting',
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poker_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES poker_tables(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buy_in INTEGER NOT NULL,
    stack INTEGER NOT NULL,
    ready BOOLEAN DEFAULT false,
    folded BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(table_id, user_id)
);

-- =============================================
-- 3. CREATE MARKETPLACE_MISSIONS TABLE (if using this name)
-- Note: Your code uses 'market_missions', so create that instead
-- =============================================

CREATE TABLE IF NOT EXISTS market_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    accepter_id UUID REFERENCES users(id),
    description TEXT NOT NULL,
    reward INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- =============================================
-- 4. CREATE GROUP_GAMES TABLE IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS group_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    buy_in INTEGER NOT NULL DEFAULT 1,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pot INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting',
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES group_games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ready BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, user_id)
);

-- =============================================
-- 5. ENABLE REAL-TIME (Handle existing publications)
-- =============================================

-- Function to safely add table to publication
CREATE OR REPLACE FUNCTION safe_add_to_publication(table_name text)
RETURNS void AS $$
BEGIN
    -- Check if already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently ignore if already exists or any other error
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Add tables to real-time publication
SELECT safe_add_to_publication('users');
SELECT safe_add_to_publication('user_missions');
SELECT safe_add_to_publication('user_cards');
SELECT safe_add_to_publication('group_games');
SELECT safe_add_to_publication('group_game_players');
SELECT safe_add_to_publication('poker_tables');
SELECT safe_add_to_publication('poker_players');
SELECT safe_add_to_publication('market_missions');
SELECT safe_add_to_publication('notifications');
SELECT safe_add_to_publication('bar_orders');
SELECT safe_add_to_publication('lottery_tickets');

-- Clean up the helper function
DROP FUNCTION IF EXISTS safe_add_to_publication(text);

-- =============================================
-- 6. CREATE HELPER FUNCTION FOR BALANCE UPDATES
-- =============================================

CREATE OR REPLACE FUNCTION update_balance(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT DEFAULT 'earn',
    p_reason TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    UPDATE users
    SET balance = balance + p_amount
    WHERE id = p_user_id
    RETURNING balance INTO new_balance;

    -- Create transaction record if transactions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        INSERT INTO transactions (user_id, amount, type, reason)
        VALUES (p_user_id, p_amount, p_type, p_reason);
    END IF;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_group_games_status ON group_games(status);
CREATE INDEX IF NOT EXISTS idx_poker_tables_status ON poker_tables(status);
CREATE INDEX IF NOT EXISTS idx_market_missions_status ON market_missions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);

-- =============================================
-- MIGRATION COMPLETE!
-- =============================================
-- Run "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
-- to verify real-time is enabled for all tables
