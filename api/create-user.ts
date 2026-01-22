// Vercel Serverless Function - create a Supabase auth user + profile using service role key
import { createClient } from '@supabase/supabase-js';

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

const ALLOWED_ROLES = ['admin', 'business', 'rider', 'customer'] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name, phone, role }: { email?: string; password?: string; name?: string; phone?: string; role?: AllowedRole } = req.body || {};

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields: email, password, name, role' });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase env vars: SUPABASE_SERVICE_ROLE_KEY and/or SUPABASE_URL');
    return res.status(500).json({ error: 'Server not configured for user creation' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { name, role, phone: phone || null },
    });

    if (authError) {
      console.error('Create user error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'User created but no user ID returned' });
    }

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      name,
      role,
      phone: phone || null,
      is_available: role === 'rider' ? true : null,
    });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return res.status(400).json({ error: profileError.message });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, userId });
  } catch (error: any) {
    console.error('Unexpected error creating user:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message || 'Failed to create user' });
  }
}
