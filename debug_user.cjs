const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nophiagrupqfbmbyuvov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vcGhpYWdydXBxZmJtYnl1dm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MjU4MzMsImV4cCI6MjA3OTMwMTgzM30.dsn0axD41yFGLqpjyiuo1deI6XfwdROTSMTSv6Uo6D8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log('1. Attempting to sign in as admin@quickhop.com...');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@quickhop.com',
        password: 'password123'
    });

    if (authError) {
        console.error('LOGIN FAILED:', authError.message);
        return;
    }

    console.log('Login successful! User ID:', authData.user.id);

    console.log('2. Checking for profile...');

    // Now check profile with the authenticated session
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id) // Query by ID, which matches the RLS policy
        .single();

    if (profileError) {
        console.log('Profile Error:', profileError.message);
        console.log('RESULT: Profile NOT found or RLS blocking access.');
    } else {
        console.log('RESULT: Profile FOUND:', profile);
    }
}

checkUser();
