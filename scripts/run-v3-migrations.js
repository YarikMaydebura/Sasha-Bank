import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const migrations = [
  // Add has_revived flag to users
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_revived BOOLEAN DEFAULT false`,

  // Add steal mission support to user_missions
  `ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false`,
  `ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id)`,

  // Steal Mission Attempts (Imposters System)
  `CREATE TABLE IF NOT EXISTS steal_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID REFERENCES users(id),
    victim_id UUID REFERENCES users(id),
    mission_id UUID REFERENCES user_missions(id),
    amount INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'dodged', 'blocked_shield')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Chain Mission Progress
  `CREATE TABLE IF NOT EXISTS chain_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chain_id TEXT NOT NULL,
    current_step INTEGER DEFAULT 1,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Hidden QR Code Scans
  `CREATE TABLE IF NOT EXISTS hidden_qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_type TEXT,
    reward_amount INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(qr_id, user_id)
  )`,

  // Group Games (Custom Games)
  `CREATE TABLE IF NOT EXISTS group_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    buy_in INTEGER NOT NULL,
    creator_id UUID REFERENCES users(id),
    pot INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'started', 'finished')),
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Group Game Players
  `CREATE TABLE IF NOT EXISTS group_game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES group_games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ready BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, user_id)
  )`,

  // Mission Marketplace
  `CREATE TABLE IF NOT EXISTS market_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id),
    description TEXT NOT NULL,
    reward INTEGER NOT NULL CHECK (reward >= 1 AND reward <= 10),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'completed', 'cancelled')),
    accepter_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`,

  // Enable RLS on new tables
  `ALTER TABLE steal_attempts ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE chain_progress ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE hidden_qr_scans ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE group_games ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE group_game_players ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE market_missions ENABLE ROW LEVEL SECURITY`,

  // Create RLS policies
  `DROP POLICY IF EXISTS "Allow all" ON steal_attempts`,
  `CREATE POLICY "Allow all" ON steal_attempts FOR ALL USING (true) WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "Allow all" ON chain_progress`,
  `CREATE POLICY "Allow all" ON chain_progress FOR ALL USING (true) WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "Allow all" ON hidden_qr_scans`,
  `CREATE POLICY "Allow all" ON hidden_qr_scans FOR ALL USING (true) WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "Allow all" ON group_games`,
  `CREATE POLICY "Allow all" ON group_games FOR ALL USING (true) WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "Allow all" ON group_game_players`,
  `CREATE POLICY "Allow all" ON group_game_players FOR ALL USING (true) WITH CHECK (true)`,

  `DROP POLICY IF EXISTS "Allow all" ON market_missions`,
  `CREATE POLICY "Allow all" ON market_missions FOR ALL USING (true) WITH CHECK (true)`,

  // Enable realtime on new tables
  `ALTER PUBLICATION supabase_realtime ADD TABLE steal_attempts`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE chain_progress`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE group_games`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE group_game_players`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE market_missions`,
]

async function runMigrations() {
  console.log('🚀 Running V3.0 Database Migrations...\n')

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const sql of migrations) {
    const shortSql = sql.substring(0, 60).replace(/\s+/g, ' ').trim()
    process.stdout.write(`Running: ${shortSql}... `)

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

    if (error) {
      // Check if it's a "already exists" type error (which is fine)
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate key') ||
        error.message.includes('relation') && error.message.includes('already a member')
      ) {
        console.log('⏭️  (already exists)')
        skipCount++
      } else {
        console.log(`❌ Error: ${error.message}`)
        errorCount++
      }
    } else {
      console.log('✅')
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary:')
  console.log(`  ✅ Successful: ${successCount}`)
  console.log(`  ⏭️  Skipped (already exists): ${skipCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log('='.repeat(60))

  if (errorCount > 0) {
    console.log('\n⚠️  Some migrations failed. You may need to run them manually in Supabase SQL Editor.')
    console.log('\nTo run manually, copy each migration SQL and run in:')
    console.log('https://supabase.com/dashboard/project/tgdtsirkuvfzynqwjtmp/sql/new')
  } else {
    console.log('\n✅ All V3.0 migrations completed successfully!')
  }
}

runMigrations().catch(console.error)
