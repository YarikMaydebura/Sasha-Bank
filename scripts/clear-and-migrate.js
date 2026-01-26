import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase credentials
const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearDatabase() {
  console.log('🗑️  Clearing database...\n')

  const tables = [
    'box_bids',
    'box_queue',
    'box_rounds',
    'trade_requests',
    'lottery_tickets',
    'trivia_sessions',
    'bar_orders',
    'user_missions',
    'transactions',
    'users'
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        console.log(`⚠️  ${table}: ${error.message}`)
      } else {
        console.log(`✅ Cleared: ${table}`)
      }
    } catch (err) {
      console.log(`⚠️  ${table}: ${err.message}`)
    }
  }

  console.log('\n✅ Database cleared!\n')
}

async function runMigration() {
  console.log('📦 Migration must be run manually in Supabase SQL Editor')
  console.log('📄 Migration file: supabase/migration_v2.sql\n')
  console.log('Steps:')
  console.log('1. Open: https://supabase.com/dashboard/project/tgdtsirkuvfzynqwjtmp/sql')
  console.log('2. Copy contents of supabase/migration_v2.sql')
  console.log('3. Paste and click "Run"')
  console.log('4. Verify success\n')
}

async function main() {
  console.log('🚀 Sasha Bank V2 - Database Setup\n')
  console.log('=' .repeat(50) + '\n')

  await clearDatabase()
  await runMigration()

  console.log('=' .repeat(50))
  console.log('\n✅ Done! Run migration in Supabase, then commit and push.\n')
}

main().catch(console.error)
