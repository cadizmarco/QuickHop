// Vercel Serverless Function - create an admin user via Supabase service role
import { createClient } from '@supabase/supabase-js';

// Minimal request/response types to avoid extra deps
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

  const { email, password, name, phone } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields: email, password, name' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase env vars: SUPABASE_SERVICE_ROLE_KEY and/or SUPABASE_URL');
    return res.status(500).json({ error: 'Server not configured for admin creation' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1) Create auth user with admin role metadata
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'admin',
        phone: phone || null,
      },
      app_metadata: {
        role: 'admin',
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      return res.status(400).json({ error: createError.message });
    }

    const userId = data.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'User created but no user ID returned' });
    }

    // 2) Ensure profile row exists with admin role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      name,
      role: 'admin',
      phone: phone || null,
      is_available: null,
    });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return res.status(400).json({ error: profileError.message });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, userId });
  } catch (error: any) {
    console.error('Unexpected error creating admin:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message || 'Failed to create admin' });
  }
}
