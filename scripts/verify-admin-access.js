import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyAdminAccess() {
  console.log('✅ Verifying admin access...\n')

  const { data: admins } = await supabase
    .from('users')
    .select('id, name, role, is_admin')
    .in('name', ['Yarik', 'Sasha'])
    .order('name')

  console.log('Admin Users:')
  console.log('=' .repeat(50))

  admins?.forEach(admin => {
    const hasAccess = admin.role === 'admin' || admin.is_admin
    console.log(`\n${admin.name}:`)
    console.log(`  Role: ${admin.role || 'NULL'}`)
    console.log(`  is_admin: ${admin.is_admin || false}`)
    console.log(`  Access: ${hasAccess ? '✅ GRANTED' : '❌ DENIED'}`)
  })

  console.log('\n' + '='.repeat(50))

  const allGood = admins?.every(a => a.role === 'admin' || a.is_admin)
  if (allGood) {
    console.log('\n✅ All admin users have correct access!')
  } else {
    console.log('\n❌ Some admin users are missing access')
  }
}

verifyAdminAccess().catch(console.error)
