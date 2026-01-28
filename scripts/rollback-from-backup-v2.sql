-- ============================================
-- Sasha Bank v2.0 - Database Rollback Script
-- ============================================
--
-- ⚠️  WARNING: This will restore data from backups
-- Only run this if you need to rollback v2.0 changes
--
-- Date: 2026-01-28
-- Purpose: Emergency rollback from Phase 0 backups
--

-- Confirm before proceeding
DO $$
BEGIN
  RAISE NOTICE '⚠️  WARNING: This will restore data from backups and DELETE current data!';
  RAISE NOTICE 'Make sure you want to proceed with rollback.';
END $$;

-- Restore users table
BEGIN;
  TRUNCATE users CASCADE;
  INSERT INTO users SELECT * FROM users_backup_v2;
COMMIT;

-- Restore user_missions table
BEGIN;
  TRUNCATE user_missions CASCADE;
  INSERT INTO user_missions SELECT * FROM user_missions_backup_v2;
COMMIT;

-- Restore transactions table
BEGIN;
  TRUNCATE transactions CASCADE;
  INSERT INTO transactions SELECT * FROM transactions_backup_v2;
COMMIT;

-- Restore risk_sessions table
BEGIN;
  TRUNCATE risk_sessions CASCADE;
  INSERT INTO risk_sessions SELECT * FROM risk_sessions_backup_v2;
COMMIT;

-- Restore notifications table
BEGIN;
  TRUNCATE notifications CASCADE;
  INSERT INTO notifications SELECT * FROM notifications_backup_v2;
COMMIT;

-- Verify restoration
SELECT
  'users' as table_name,
  COUNT(*) as row_count,
  'Restored' as status
FROM users
UNION ALL
SELECT
  'user_missions',
  COUNT(*),
  'Restored'
FROM user_missions
UNION ALL
SELECT
  'transactions',
  COUNT(*),
  'Restored'
FROM transactions
UNION ALL
SELECT
  'risk_sessions',
  COUNT(*),
  'Restored'
FROM risk_sessions
UNION ALL
SELECT
  'notifications',
  COUNT(*),
  'Restored'
FROM notifications;

-- Success message
SELECT '✅ Database restored from backups successfully!' as status;
SELECT '⚠️  Remember to clear localStorage and re-login in the app!' as reminder;
