import { supabase } from './supabase';
import type { Database } from './supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<ProfileRow | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        return data || null;
    } catch (error: any) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            throw new Error('Authentication error. Please try logging in again.');
        }
        if (error.message?.includes('timeout') || error.message?.includes('network')) {
            throw new Error('Network error. Please check your connection and try again.');
        }
        throw error;
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<ProfileRow>
): Promise<ProfileRow> {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all users by role (Admin function)
 */
export async function getUsersByRole(
    role: 'admin' | 'customer' | 'business' | 'rider'
): Promise<ProfileRow[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get all available riders (for assignment)
 */
export async function getAvailableRiders(): Promise<ProfileRow[]> {
    const { data: riders, error: ridersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'rider');

    if (ridersError) throw ridersError;

    const { data: activeDeliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('rider_id')
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .not('rider_id', 'is', null);

    if (deliveriesError) throw deliveriesError;

    const busyRiderIds = new Set(activeDeliveries?.map(d => d.rider_id) || []);

    return (riders || []).filter(rider => !busyRiderIds.has(rider.id));
}

/**
 * Create a new user profile (for testing/admin use)
 * Note: This requires the user to be created in auth.users first
 */
export async function createUserProfile(
    profileData: ProfileInsert
): Promise<ProfileRow> {
    const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all users (Admin function)
 */
export async function getAllUsers(): Promise<ProfileRow[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
