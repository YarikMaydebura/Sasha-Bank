# Sasha Bank v2.0 - Database Migration Scripts

## Execution Order

**IMPORTANT**: Run these scripts in the Supabase SQL Editor in this exact order.

### Step 1: Backup Database (Phase 0)
**File**: `backup-database-v2.sql`

Run this FIRST to create backup tables. This ensures you can rollback if needed.

```sql
-- Copy and paste the contents of backup-database-v2.sql
-- into Supabase SQL Editor and run
```

**Expected result**:
- Creates backup tables: `users_backup_v2`, `user_missions_backup_v2`, etc.
- Shows row counts for verification

---

### Step 2: Apply Schema Changes (Phase 1)
**File**: `phase1-schema-changes.sql`

Run this AFTER backups are complete. This creates all new tables and modifies existing ones.

```sql
-- Copy and paste the contents of phase1-schema-changes.sql
-- into Supabase SQL Editor and run
```

**Expected result**:
- Creates 6 new tables: `user_cards`, `card_usage_logs`, `poker_rounds`, `poker_players`, `photos`, `guest_traits`
- Adds columns to existing tables: `user_missions`, `risk_sessions`, `lottery_tickets`
- Enables RLS and realtime subscriptions
- Shows verification queries confirming all changes

**Duration**: ~2-3 minutes to execute

---

### Step 3: Verify Changes
After running both scripts, verify:

1. **Check new tables exist**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_cards',
    'card_usage_logs',
    'poker_rounds',
    'poker_players',
    'photos',
    'guest_traits'
  );
```

2. **Check backups exist**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%_backup_v2';
```

3. **Check realtime enabled**:
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('user_cards', 'poker_rounds', 'photos');
```

---

## Rollback (Emergency Only)

**File**: `rollback-from-backup-v2.sql`

⚠️ **WARNING**: Only run this if you need to completely rollback v2.0 changes.

This will:
- Delete all current data
- Restore from backup tables
- Require users to clear localStorage and re-login

---

## Notes

- All scripts use `IF NOT EXISTS` and `IF EXISTS` to be idempotent
- Safe to run multiple times
- No data loss - all modifications are additive
- Backup tables remain in database for safety

---

## Next Steps After Database Migration

Once Phase 1 SQL is complete:

1. Continue with Phase 2: Delete deprecated files (Box.jsx, Games.jsx, etc.)
2. Continue with Phase 3: Implement Cards System
3. Continue with remaining phases as per the main plan

---

## Support

If you encounter errors:
1. Check Supabase logs for specific error messages
2. Verify RLS policies aren't blocking operations
3. Ensure realtime publication has correct permissions
4. Consult `/Users/maydeburayaroslav/.claude/plans/expressive-sleeping-lobster.md` for full plan details
