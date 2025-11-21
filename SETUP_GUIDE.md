# Quick Setup - Supabase Integration

This guide will help you set up the Supabase database for QuickHop.

## Prerequisites Completed ✅

- [x] Environment variables added to `.env`
- [x] Supabase client library installed (`@supabase/supabase-js`)
- [x] Authentication integrated with Supabase Auth
- [x] Service layers created (`deliveryService.ts`, `userService.ts`)
- [x] `BusinessDashboard.tsx` updated with real data

## Next Steps - Database Setup

### 1. Run SQL Scripts in Supabase

Open your Supabase Dashboard: https://nophiagrupqfbmbyuvov.supabase.co

#### Step 1: Create Tables (schema.sql)
1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase/schema.sql` in your editor
4. Copy all contents and paste into SQL Editor
5. Click **Run** or press Cmd+Enter

**What this does:**
- Creates `profiles`, `deliveries`, and `drop_offs` tables
- Sets up indexes for performance
- Creates triggers for auto-updating timestamps
- Auto-creates a profile when a user signs up

#### Step 2: Enable Row Level Security (rls_policies.sql)
1. In SQL Editor, click **New Query**
2. Open `supabase/rls_policies.sql`
3. Copy all contents and paste into SQL Editor
4. Click **Run**

**What this does:**
- Enables RLS on all tables
- Creates policies for each role (admin, business, rider, customer)
- Ensures users can only access data they're authorized to see

#### Step 3: Enable Real-time (realtime_config.sql)
1. In SQL Editor, click **New Query**
2. Open `supabase/realtime_config.sql`
3. Copy all contents and paste into SQL Editor
4. Click **Run**

**What this does:**
- Enables real-time subscriptions on `deliveries` and `drop_offs` tables
- Allows live updates across dashboards without refreshing

---

### 2. Create Test Users

You need to create test users in Supabase for each role.

#### Using Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click **Add User** (top right)
3. Create these test accounts:

| Email | Password | Role (set in profiles table) |
|-------|----------|-------------------------------|
| business@quickhop.com | password123 | business |
| rider@quickhop.com | password123 | rider |
| customer@quickhop.com | password123 | customer |
| admin@quickhop.com | password123 | admin |

**For each user:**
1. Click **Add User**
2. Enter email and password
3. Click **Create User**
4. **IMPORTANT:** After creating, go to **Table Editor** → **profiles**
5. Find the user row (match the `id` with the auth user ID)
6. Edit the row and set the `role` field to the appropriate role
7. Set the `name` field (e.g., "Test Business", "Test Rider", etc.)
8. Optionally add a `phone` number for customer testing

---

### 3. Verify Setup

#### Check Tables:
- Go to **Table Editor** in Supabase Dashboard
- Verify these tables exist:
  - `profiles`  
  - `deliveries`
  - `drop_offs`

#### Check RLS:
- Go to **Authentication** → **Policies**
- You should see multiple policies for each table

#### Check Real-time:
- Go to **Database** → **Replication**
- Under `supabase_realtime` publication, verify `deliveries` and `drop_offs` are listed

---

### 4. Run the Application

```bash
npm run dev
```

Navigate to http://localhost:5173

**Login with test account:**
- Email: `business@quickhop.com`
- Password: `password123`

You should be redirected to the Business Dashboard.

---

## Testing the Integration

### Test 1: Business Creates Delivery

1. Login as `business@quickhop.com`
2. Click "New Delivery"
3. Fill in:
   - Pickup address
   - At least 2 drop-off locations with customer details
4. Click "Create Booking"
5. Check Supabase Dashboard → **Table Editor** → **deliveries**
   - Verify delivery was created
6. Check **drop_offs** table
   - Verify drop-offs were created with correct `delivery_id`

### Test 2: Real-time Updates

1. Open Business Dashboard in one browser tab
2. In another tab, go to Supabase Dashboard → **Table Editor** → **deliveries**
3. Manually edit a delivery (change status to "assigned")
4. Watch the Business Dashboard - it should update automatically!

### Test 3: Authentication

1. Logout
2. Try to access `/business` directly without logging in
3. You should be redirected or see no data (protected by RLS)

---

## Troubleshooting

### "No data showing up"
- Check if RLS policies were created correctly
- Verify your user has a profile in the `profiles` table with the correct `role`
- Open browser console to see any errors

### "Can't create deliveries"
- Check browser console for errors
- Verify RLS policies allow your role to INSERT into tables
- Make sure you're logged in with a business account

### "Real-time not working"
- Verify real-time is enabled in Supabase Dashboard → Database → Replication
- Check browser console for WebSocket connection errors
- Try refreshing the page

---

## Next Steps

After verifying the basic setup works:

1. Update `RiderDashboard.tsx` to fetch assigned deliveries
2. Update `CustomerDashboard.tsx` to track deliveries by phone
3. Implement rider assignment logic (manual or automatic)
4. Add admin dashboard functionality

---

## Quick Reference

**Supabase Dashboard:** https://nophiagrupqfbmbyuvov.supabase.co

**Environment Variables:**
```
VITE_SUPABASE_URL=https://nophiagrupqfbmbyuvov.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh... (already in .env)
```

**Test Accounts:**
- business@quickhop.com / password123
- rider@quickhop.com / password123
- customer@quickhop.com / password123
- admin@quickhop.com / password123
