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

async function runMigration() {
  console.log('📦 Running V2 Migration...\n')

  const migrationPath = path.join(__dirname, '../supabase/migration_v2.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  try {
    // Attempt to run the migration
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      console.log('❌ Migration failed with anon key (expected)')
      console.log('Error:', error.message)
      console.log('\n📄 Please run migration manually in Supabase SQL Editor:')
      console.log('1. Open: https://supabase.com/dashboard/project/tgdtsirkuvfzynqwjtmp/sql')
      console.log('2. Copy contents of supabase/migration_v2.sql')
      console.log('3. Paste and click "Run"')
      console.log('4. Verify success\n')
      return false
    }

    console.log('✅ Migration completed successfully!\n')
    return true
  } catch (err) {
    console.log('❌ Could not run migration automatically')
    console.log('\n📄 Please run migration manually in Supabase SQL Editor:')
    console.log('1. Open: https://supabase.com/dashboard/project/tgdtsirkuvfzynqwjtmp/sql')
    console.log('2. Copy contents of supabase/migration_v2.sql')
    console.log('3. Paste and click "Run"')
    console.log('4. Verify success\n')
    return false
  }
}

runMigration().catch(console.error)
