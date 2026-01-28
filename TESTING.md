# Sasha Bank v2.0 - Integration Testing Guide

**Last Updated**: 2026-01-28
**Phase**: 7 - Integration Testing

---

## 🎯 Testing Overview

This document provides comprehensive test scenarios for all implemented features in Sasha Bank v2.0.

**Testing Environment**:
- Local development server: `npm run dev`
- Supabase database: Production instance
- Multiple browser tabs/devices for multiplayer testing

---

## ✅ PRE-TESTING CHECKLIST

Before starting tests, ensure:

1. **Database Schema Applied**
   - [ ] Run `scripts/phase1-schema-changes.sql` in Supabase SQL Editor
   - [ ] Verify all tables exist: `user_cards`, `poker_rounds`, `poker_players`, `photos`, `guest_traits`, `card_usage_logs`
   - [ ] Confirm RLS policies are enabled
   - [ ] Check realtime subscriptions are enabled

2. **Application Running**
   - [ ] Run `npm install` (if needed)
   - [ ] Run `npm run dev`
   - [ ] Application loads without errors
   - [ ] No console errors on startup

3. **Test Accounts**
   - [ ] Admin account: Yarik or Sasha
   - [ ] 2-3 guest accounts for multiplayer testing
   - [ ] Clear browser cache/localStorage between account switches

---

## 🧪 TEST SCENARIOS

### TEST 1: User Registration with Traits

**Objective**: Verify trait selection and auto-mission assignment

**Steps**:
1. Open app in incognito window
2. Enter a new name (e.g., "TestUser1")
3. Create a 4-digit PIN (e.g., 1234)
4. **Expected**: Trait selection screen appears with 8 traits
5. Select "Social Butterfly" 🦋
6. Click Continue
7. **Expected**: Successfully registered, redirected to dashboard

**Verification**:
- [ ] User starts with 100 coins
- [ ] Navigate to /missions
- [ ] **Expected**: 3 missions assigned with "Social Butterfly" theme
- [ ] Check mission types: "Meet 5 new people", "Start 3 conversations", "Take group photo"
- [ ] All missions have trait indicator

**Database Check**:
```sql
SELECT * FROM guest_traits WHERE user_id = '<test-user-id>';
SELECT * FROM user_missions WHERE user_id = '<test-user-id>' AND trait_category = 'social_butterfly';
```

**Pass Criteria**: ✅ Trait saved, 3 missions assigned, missions appear in UI

---

### TEST 2: Cards System - Win & Use

**Objective**: Test card winning from Risk and card usage

**Steps - Part A: Win Card**:
1. Login as test user
2. Navigate to Risk station
3. Play Level 1 (1 coin) multiple times until you win a card (10% chance)
4. **Expected**: Card win animation appears
5. **Expected**: Toast notification "You won [Card Name]!"
6. Navigate to /my-cards
7. **Expected**: Won card appears in inventory

**Steps - Part B: Use Card**:
1. From My Cards page, tap on the card
2. **Expected**: Card details modal opens
3. Click "Use Card"
4. **Expected**: User selector appears (if target required)
5. Select another user
6. Confirm usage
7. **Expected**: Card effect applies (coins stolen/balance swapped/notification sent)
8. **Expected**: Card status changes to "used"

**Admin Verification**:
1. Login as admin (Yarik/Sasha)
2. Go to Admin Dashboard → Guest Ask tab
3. **Expected**: If card requires admin (DJ Power, Prank, etc.), it appears here
4. Mark as done

**Database Check**:
```sql
SELECT * FROM user_cards WHERE user_id = '<test-user-id>';
SELECT * FROM card_usage_logs WHERE user_id = '<test-user-id>';
```

**Pass Criteria**: ✅ Card won, appears in inventory, can be used, effects apply, admin notifications work

---

### TEST 3: Poker System - Full Game Flow

**Objective**: Test multiplayer poker from creation to winner payout

**Setup**: Need 2-3 test accounts + admin account

**Steps - Part A: Admin Creates Round**:
1. Login as admin
2. Go to Admin Dashboard → Poker tab
3. Set minimum buy-in: 3 coins
4. Click "CREATE POKER ROUND"
5. **Expected**: Round created with status "OPEN"

**Steps - Part B: Players Join**:
1. Login as TestUser1 (separate browser/incognito)
2. Navigate to /poker
3. **Expected**: See open round with "JOIN NOW" badge
4. Click "JOIN ROUND"
5. Select buy-in amount: 5 coins
6. Confirm
7. **Expected**: Joined round, pot increases by 5, chip count shows 5
8. Repeat for TestUser2 (buy-in 10 coins) and TestUser3 (buy-in 3 coins)

**Steps - Part C: Admin Locks & Plays**:
1. Switch to admin account
2. Go to Poker tab
3. **Expected**: See 3 players with total pot = 18 coins
4. Click "LOCK & START ROUND"
5. **Expected**: Round status changes to "PLAYING"

**Steps - Part D: Player Folds**:
1. Switch to TestUser3
2. Click "FOLD" button
3. **Expected**: Status changes to "folded", can't add more chips

**Steps - Part E: Admin Selects Winners**:
1. Switch to admin account
2. Tap on TestUser1 (should highlight with gold border)
3. Tap on TestUser2 (should highlight)
4. **Expected**: Both marked as winners, TestUser1 shows "(70%)"
5. Click "END ROUND (2 winners)"
6. **Expected**: Pot distributed:
   - TestUser1: 18 * 0.7 = 12 coins
   - TestUser2: 18 * 0.3 = 5 coins
   - TestUser3: 0 coins

**Verification**:
1. Check each user's balance increased correctly
2. Check notifications sent to winners
3. Verify transactions logged

**Database Check**:
```sql
SELECT * FROM poker_rounds WHERE status = 'ended' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM poker_players WHERE round_id = '<round-id>';
SELECT * FROM transactions WHERE type IN ('poker_buy_in', 'poker_win');
```

**Pass Criteria**: ✅ Round creation, joining, locking, folding, winner selection, payouts all work correctly

---

### TEST 4: Photo Challenges

**Objective**: Test photo capture, upload, and coin reward

**Steps - Part A: User Takes Photo**:
1. Login as test user
2. Navigate to /photos
3. Click "GET PHOTO CHALLENGE"
4. **Expected**: Random prompt appears (e.g., "🎂 Take a selfie with the birthday girl!")
5. Click "OPEN CAMERA"
6. **Expected**: Browser asks for camera permission
7. Grant permission
8. **Expected**: Video preview appears
9. Position camera and click "CAPTURE"
10. **Expected**: Photo captured, preview shown
11. Click "SUBMIT & EARN 5🪙"
12. **Expected**: Photo uploads, +5 coins added, toast notification

**Steps - Part B: View Gallery**:
1. Stay on /photos
2. Scroll to "YOUR PHOTOS" section
3. **Expected**: Submitted photo appears with prompt label and +5🪙 badge

**Steps - Part C: Admin Gallery**:
1. Login as admin
2. Go to Admin Dashboard → Photos tab
3. **Expected**: See all submitted photos grouped by user
4. Click on a photo
5. **Expected**: Photo detail modal opens with user, prompt, timestamp
6. Click "Download" (optional - verify photo opens in new tab)

**Steps - Part D: Admin Send Prompt**:
1. Stay on Photos admin tab
2. Click "SEND PHOTO PROMPT TO ALL"
3. **Expected**: Random prompt sent to all users
4. Switch to test user account
5. **Expected**: Notification received with photo prompt

**Database Check**:
```sql
SELECT * FROM photos WHERE user_id = '<test-user-id>';
SELECT * FROM transactions WHERE type = 'photo_reward';
```

**Pass Criteria**: ✅ Camera works, photo uploads, coins awarded, admin can view/download, prompt broadcast works

---

### TEST 5: Lottery Draw System

**Objective**: Test end-to-end lottery flow

**Steps - Part A: Users Buy Tickets**:
1. Login as TestUser1
2. Navigate to /lottery
3. **Expected**: See prize categories (Coins, Cards, Punishments, Physical)
4. **Expected**: See "Physical Bucket Draw" info card
5. Click "BUY TICKET"
6. **Expected**: Ticket purchased, balance decreases by 10, ticket number assigned
7. Repeat for TestUser2 and TestUser3 (buy 2-3 tickets each)

**Steps - Part B: Admin Draws Winner**:
1. Login as admin
2. Go to Admin Dashboard → Lottery tab
3. **Expected**: See all purchased tickets with stats (Total/Active/Winners)
4. In "Draw Winner" section:
   - Enter ticket number (e.g., #001)
   - Select prize type: "Bonus Coins"
   - Select prize value: "+20"
5. Click "CONFIRM WINNER"
6. **Expected**: Winner processed, coins added, notification sent

**Steps - Part C: Verify Winner Received Prize**:
1. Switch to ticket owner's account
2. **Expected**: Balance increased by 20 coins
3. Check notifications - should have "🎰 Lottery Winner!"
4. Go to /lottery
5. **Expected**: Winning ticket shows "🏆 WINNER!" badge

**Steps - Part D: Test Card Prize**:
1. Admin draws another winner
2. Prize type: "Collectible Card"
3. Prize value: "legendary"
4. Confirm
5. **Expected**: Winner receives random legendary card in inventory

**Database Check**:
```sql
SELECT * FROM lottery_tickets WHERE status = 'won';
SELECT * FROM user_cards WHERE obtained_from = 'lottery';
```

**Pass Criteria**: ✅ Ticket purchase, admin draw interface, prize types work, winners notified correctly

---

### TEST 6: Mission Confirmation Flow

**Objective**: Test QR-based mission verification

**Setup**: Need mission with `requires_confirmation = true` and `verification = 'target'`

**Steps - Part A: Create Confirmation Mission**:
1. Login as admin
2. Go to Admin Dashboard → Overview
3. Click "GENERATE PERSONAL MISSIONS" (this creates missions with confirmations)
4. **Expected**: Missions assigned to all users

**Steps - Part B: User Completes Mission**:
1. Login as TestUser1
2. Go to /missions
3. Find mission requiring target confirmation
4. **Expected**: Mission shows "Needs confirm" badge
5. Note: User needs to have target person scan their QR

**Steps - Part C: Target Confirms Mission**:
1. Login as target user (the person mentioned in mission)
2. Go to /scan
3. Scan TestUser1's QR code (or manually navigate to `/mission-confirm/<mission-id>/<target-user-id>`)
4. **Expected**: Mission confirmation page loads
5. **Expected**: Shows mission details, reward amount, confirmation type
6. Click "✅ Confirm Mission"
7. **Expected**: Mission marked complete, TestUser1 receives coins

**Steps - Part D: Verify Completion**:
1. Switch to TestUser1
2. Go to /missions
3. **Expected**: Mission status = "completed"
4. Check balance increased by reward amount
5. Check notifications for confirmation message

**Database Check**:
```sql
SELECT * FROM user_missions WHERE requires_confirmation = true AND status = 'completed';
```

**Pass Criteria**: ✅ QR scan works, mission confirmation page loads, coins awarded, both users notified

---

### TEST 7: Admin Guest Ask Panel

**Objective**: Test admin notification system for card actions

**Steps - Part A: User Uses Admin-Required Card**:
1. Ensure test user has a card that requires admin (DJ Power, Prank, Mystery Box, or Chaos)
2. If not, admin can grant one manually via database
3. Login as test user
4. Go to /my-cards
5. Use the admin-required card (e.g., DJ Power)
6. **Expected**: Card marked as used, notification created

**Steps - Part B: Admin Views Request**:
1. Login as admin
2. Go to Admin Dashboard → Guest Ask tab
3. **Expected**: Card usage appears in "Card Actions" section
4. **Expected**: Shows card emoji, name, user, target (if applicable)
5. **Expected**: Specific instructions (e.g., "🎧 Play the requested song")
6. Click "✅ Done"
7. **Expected**: Request acknowledged

**Steps - Part C: Song Request**:
1. Test user needs "Song Request" card or ability
2. Use card to request song
3. **Expected**: Appears in admin Guest Ask under "Song Requests"
4. Admin clicks "✅ Mark as Played"
5. **Expected**: User receives notification "🎵 Song Request Played!"

**Database Check**:
```sql
SELECT * FROM card_usage_logs WHERE admin_notified = true;
SELECT * FROM song_requests WHERE status = 'pending';
```

**Pass Criteria**: ✅ Admin sees card actions, song requests, can mark as done, users notified

---

### TEST 8: Real-Time Updates

**Objective**: Verify real-time subscriptions work across all features

**Setup**: Two browser windows side-by-side (User + Admin)

**Test Scenarios**:

**Scenario A: Balance Updates**
1. Window 1: TestUser1 dashboard
2. Window 2: Admin panel
3. Admin adjusts TestUser1's balance (+10 coins)
4. **Expected**: Window 1 balance updates instantly without refresh

**Scenario B: Card Win**
1. Window 1: TestUser1 at /my-cards
2. Window 2: Admin grants card to TestUser1 (via DB or future admin feature)
3. **Expected**: Window 1 shows new card appears in real-time

**Scenario C: Poker Updates**
1. Window 1: TestUser1 in poker round
2. Window 2: TestUser2 joins same round
3. **Expected**: Window 1 sees TestUser2 appear in players list
4. **Expected**: Pot amount updates in real-time

**Scenario D: Lottery Draw**
1. Window 1: TestUser1 on /lottery page
2. Window 2: Admin draws TestUser1's ticket as winner
3. **Expected**: Window 1 ticket changes to "🏆 WINNER!" in real-time

**Pass Criteria**: ✅ All real-time updates occur within 1-2 seconds without page refresh

---

### TEST 9: Dashboard Integration

**Objective**: Test new dashboard sections

**Steps**:
1. Login as test user
2. Go to /dashboard
3. **Expected**: See Big Cards Section showing up to 5 owned cards
4. **Expected**: See Big Missions Section with stats (Total/Active/Done)
5. **Expected**: Stations reordered: Lottery & Bar at top

**Test Card Updates**:
1. Win a card from Risk
2. Return to dashboard
3. **Expected**: New card appears in Big Cards Section
4. If >5 cards, shows "+X more" indicator

**Test Mission Updates**:
1. Complete a mission
2. Return to dashboard
3. **Expected**: Mission stats update (Active count decreases, Done count increases)

**Pass Criteria**: ✅ Dashboard shows cards and missions, real-time updates work

---

### TEST 10: Cross-Feature Integration

**Objective**: Test how features interact with each other

**Scenario A: Cards from Multiple Sources**
1. Win card from Risk (obtained_from = 'risk')
2. Win card from Lottery (obtained_from = 'lottery')
3. Complete trait mission that rewards card (obtained_from = 'mission')
4. Go to /my-cards
5. **Expected**: All cards visible with correct obtained_from status

**Scenario B: Coin Flow Tracking**
1. Note starting balance
2. Complete photo challenge (+5)
3. Win poker round (+X)
4. Complete mission (+reward)
5. Go to /history
6. **Expected**: All transactions logged with correct types

**Scenario C: Notification Center**
1. Perform multiple actions (win card, win poker, lottery winner, mission confirmed)
2. Click notification bell
3. **Expected**: All notifications appear chronologically
4. Mark as read
5. **Expected**: Badge count decreases

**Pass Criteria**: ✅ Features integrate smoothly, data flows correctly between systems

---

## 🐛 KNOWN ISSUES & EDGE CASES

### Edge Case 1: Camera Permission Denied
- **Test**: Deny camera permission when prompted in Photos
- **Expected**: User-friendly error message
- **Fallback**: Option to retry or upload from gallery

### Edge Case 2: Empty Poker Round
- **Test**: Admin tries to lock round with 0-1 players
- **Expected**: Lock button disabled, error message

### Edge Case 3: Insufficient Balance
- **Test**: Try to buy lottery ticket with <10 coins
- **Expected**: Button disabled, "Not enough coins!" message

### Edge Case 4: Invalid Mission Confirmation
- **Test**: Wrong user tries to confirm target-specific mission
- **Expected**: Error message "Only the target user can confirm"

### Edge Case 5: Double-Confirmation
- **Test**: Try to confirm same mission twice
- **Expected**: "Mission already completed" error

---

## 📊 TEST RESULTS TEMPLATE

Use this template to track test results:

```
TEST #: [Number] - [Name]
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [Local/Staging/Production]

Status: [ ] PASS  [ ] FAIL  [ ] PARTIAL

Results:
- Step 1: [✅ PASS / ❌ FAIL]
- Step 2: [✅ PASS / ❌ FAIL]
- Step 3: [✅ PASS / ❌ FAIL]

Issues Found:
1. [Description]
2. [Description]

Screenshots: [Links if applicable]

Notes:
[Additional observations]
```

---

## 🚀 POST-TESTING CHECKLIST

After completing all tests:

- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Performance acceptable (page load <2s, real-time updates <2s)
- [ ] No console errors in production build
- [ ] Mobile responsive (test on phone)
- [ ] Database queries optimized
- [ ] Security checks passed (no exposed admin routes, RLS working)

---

## 📝 REGRESSION TESTS

Before each deployment, run these quick smoke tests:

1. **User Registration**: Create new account ✅
2. **Login**: Existing user login works ✅
3. **Balance Update**: Admin can adjust balance ✅
4. **Risk Play**: Can play Risk and win/lose ✅
5. **Card Use**: Can use owned card ✅
6. **Mission Complete**: Can complete honor mission ✅
7. **Poker Join**: Can join open poker round ✅
8. **Photo Submit**: Can take and submit photo ✅
9. **Lottery Buy**: Can purchase lottery ticket ✅
10. **Admin Access**: Admin dashboard loads ✅

---

**Ready for Phase 8: Deployment!** 🎉
