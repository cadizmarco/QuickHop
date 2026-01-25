// Seed an admin user into Supabase auth and profiles using the service role key.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.cjs \
//     --email admin@quickhop.com --password password123 --name "Admin User" [--phone +639123456789]
//
// Notes:
// - Requires @supabase/supabase-js installed (already in project deps).
// - Uses auth.admin.createUser with email_confirm=true and then upserts profiles.
// - If the email already exists, it will reuse that user instead of failing.

const { createClient } = require('@supabase/supabase-js');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!value) continue;
    if (key === '--email') parsed.email = value;
    if (key === '--password') parsed.password = value;
    if (key === '--name') parsed.name = value;
    if (key === '--phone') parsed.phone = value;
  }
  return parsed;
}

async function findUserByEmail(admin, email) {
  // listUsers supports pagination; fetch first page with generous page size
  const { data, error } = await admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function main() {
  const { email, password, name, phone } = parseArgs();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!email || !password || !name) {
    console.error('Missing required args: --email --password --name');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let userId;

    // Try to create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { name, role: 'admin', phone: phone || null },
    });

    if (error) {
      // If user already exists, fetch it; otherwise fail
      if (error.message && error.message.toLowerCase().includes('already registered')) {
        const existing = await findUserByEmail(supabase.auth.admin, email);
        if (!existing) throw error;
        userId = existing.id;
        console.log('User already exists, reusing:', userId);
      } else {
        throw error;
      }
    } else {
      userId = data.user?.id;
      console.log('Created auth user:', userId);
    }

    if (!userId) {
      throw new Error('No user id obtained for admin seed');
    }

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      name,
      role: 'admin',
      phone: phone || null,
      is_available: null,
    });

    if (profileError) throw profileError;

    console.log('Profile upserted for admin:', userId);
    console.log('Seed complete. Admin credentials:', email, password);
  } catch (err) {
    console.error('Seed failed:', err.message || err);
    process.exit(1);
  }
}

main();
