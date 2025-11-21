import { supabase } from './supabase';
import type { Database } from './supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<ProfileRow | null> {
    try {
        console.log('Fetching profile from database for user:', userId);
        
        const startTime = Date.now();
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const duration = Date.now() - startTime;
        console.log(`Profile query completed in ${duration}ms`);

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                console.warn('No profile found for user:', userId);
                return null;
            }
            console.error('Database error fetching profile:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }

        if (!data) {
            console.warn('Profile query returned no data for user:', userId);
            return null;
        }

        console.log('Profile fetched successfully:', data.email, data.role);
        return data;
    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        // Provide more helpful error messages
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
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * Get all users by role (Admin function)
 */
export async function getUsersByRole(
    role: 'admin' | 'customer' | 'business' | 'rider'
): Promise<ProfileRow[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', role)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching users by role:', error);
        throw error;
    }
}

/**
 * Get all available riders (for assignment)
 */
export async function getAvailableRiders(): Promise<ProfileRow[]> {
    try {
        // Get all riders
        const { data: riders, error: ridersError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'rider');

        if (ridersError) throw ridersError;

        // Get riders with active deliveries
        const { data: activeDeliveries, error: deliveriesError } = await supabase
            .from('deliveries')
            .select('rider_id')
            .in('status', ['assigned', 'picked_up', 'in_transit'])
            .not('rider_id', 'is', null);

        if (deliveriesError) throw deliveriesError;

        const busyRiderIds = new Set(activeDeliveries?.map(d => d.rider_id) || []);

        // Filter out busy riders
        const availableRiders = (riders || []).filter(
            rider => !busyRiderIds.has(rider.id)
        );

        return availableRiders;
    } catch (error) {
        console.error('Error fetching available riders:', error);
        throw error;
    }
}

/**
 * Create a new user profile (for testing/admin use)
 * Note: This requires the user to be created in auth.users first
 */
export async function createUserProfile(
    profileData: ProfileInsert
): Promise<ProfileRow> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

/**
 * Get all users (Admin function)
 */
export async function getAllUsers(): Promise<ProfileRow[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching all users:', error);
        throw error;
    }
}
