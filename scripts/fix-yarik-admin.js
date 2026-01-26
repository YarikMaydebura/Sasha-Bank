import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixYarikAdmin() {
  console.log('🔧 Fixing Yarik admin access...\n')

  // Check current state
  const { data: before } = await supabase
    .from('users')
    .select('id, name, role, is_admin')
    .eq('name', 'Yarik')
    .single()

  console.log('Before:')
  console.log('  Name:', before?.name)
  console.log('  Role:', before?.role)
  console.log('  is_admin:', before?.is_admin)
  console.log()

  // Update role to admin
  const { data: after, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('name', 'Yarik')
    .select('id, name, role, is_admin')
    .single()

  if (error) {
    console.error('❌ Failed to update:', error.message)
    return
  }

  console.log('After:')
  console.log('  Name:', after.name)
  console.log('  Role:', after.role)
  console.log('  is_admin:', after.is_admin)
  console.log()

  console.log('✅ Yarik role updated to admin!')
  console.log('\n⚠️  IMPORTANT: Clear your browser localStorage and re-login to apply changes')
  console.log('   1. Open browser DevTools (F12)')
  console.log('   2. Go to Application > Local Storage')
  console.log('   3. Delete "sasha-bank-session" key')
  console.log('   4. Refresh page and login again')
}

fixYarikAdmin().catch(console.error)
