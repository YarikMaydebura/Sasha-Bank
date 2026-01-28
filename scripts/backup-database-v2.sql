-- ============================================
-- Sasha Bank v2.0 - Database Backup Script
-- ============================================
--
-- Run this in Supabase SQL Editor BEFORE making any schema changes
-- This creates backup tables for safe rollback capability
--
-- Date: 2026-01-28
-- Purpose: Phase 0 - Backup & Preparation
--

-- Backup users table
SELECT * INTO users_backup_v2 FROM users;

-- Backup user_missions table
SELECT * INTO user_missions_backup_v2 FROM user_missions;

-- Backup transactions table
SELECT * INTO transactions_backup_v2 FROM transactions;

-- Backup risk_sessions table
SELECT * INTO risk_sessions_backup_v2 FROM risk_sessions;

-- Backup notifications table
SELECT * INTO notifications_backup_v2 FROM notifications;

-- Backup lottery_tickets table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_tickets') THEN
    EXECUTE 'SELECT * INTO lottery_tickets_backup_v2 FROM lottery_tickets';
  END IF;
END $$;

-- Verify backups created
SELECT
  'users_backup_v2' as table_name,
  COUNT(*) as row_count
FROM users_backup_v2
UNION ALL
SELECT
  'user_missions_backup_v2',
  COUNT(*)
FROM user_missions_backup_v2
UNION ALL
SELECT
  'transactions_backup_v2',
  COUNT(*)
FROM transactions_backup_v2
UNION ALL
SELECT
  'risk_sessions_backup_v2',
  COUNT(*)
FROM risk_sessions_backup_v2
UNION ALL
SELECT
  'notifications_backup_v2',
  COUNT(*)
FROM notifications_backup_v2;

-- Success message
SELECT '✅ Database backups created successfully!' as status;
