import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
// Note: persistSession is set to false so users are not remembered after logout or closing the tab
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false, // Disable auto-refresh since we're not persisting sessions
        persistSession: false, // Don't persist sessions - user must log in each time they open the app
        detectSessionInUrl: false, // Don't detect sessions in URL to prevent auto-login
        storage: typeof window !== 'undefined' ? {
            getItem: () => null, // Always return null - don't read from storage
            setItem: () => { }, // Do nothing - don't write to storage
            removeItem: () => { }, // Do nothing - don't remove from storage
        } : undefined,
    },
});

// Database Types
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    role: 'admin' | 'customer' | 'business' | 'rider';
                    phone: string | null;
                    is_available: boolean | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    name: string;
                    role: 'admin' | 'customer' | 'business' | 'rider';
                    phone?: string | null;
                    is_available?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    role?: 'admin' | 'customer' | 'business' | 'rider';
                    phone?: string | null;
                    is_available?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            deliveries: {
                Row: {
                    id: string;
                    business_id: string;
                    business_name: string;
                    pickup_address: string;
                    pickup_lat: number | null;
                    pickup_lng: number | null;
                    rider_id: string | null;
                    rider_name: string | null;
                    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
                    scheduled_for: string | null;
                    notes: string | null;
                    created_at: string;
                    completed_at: string | null;
                };
                Insert: {
                    id?: string;
                    business_id: string;
                    business_name: string;
                    pickup_address: string;
                    pickup_lat?: number | null;
                    pickup_lng?: number | null;
                    rider_id?: string | null;
                    rider_name?: string | null;
                    status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
                    scheduled_for?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    completed_at?: string | null;
                };
                Update: {
                    id?: string;
                    business_id?: string;
                    business_name?: string;
                    pickup_address?: string;
                    pickup_lat?: number | null;
                    pickup_lng?: number | null;
                    rider_id?: string | null;
                    rider_name?: string | null;
                    status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
                    scheduled_for?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    completed_at?: string | null;
                };
            };
            drop_offs: {
                Row: {
                    id: string;
                    delivery_id: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email: string | null;
                    address: string;
                    lat: number | null;
                    lng: number | null;
                    status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
                    sequence: number;
                    tracking_number: string | null;
                    delivered_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    delivery_id: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email?: string | null;
                    address: string;
                    lat?: number | null;
                    lng?: number | null;
                    status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
                    sequence?: number;
                    tracking_number?: string | null;
                    delivered_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    delivery_id?: string;
                    customer_name?: string;
                    customer_phone?: string;
                    customer_email?: string | null;
                    address?: string;
                    lat?: number | null;
                    lng?: number | null;
                    status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
                    sequence?: number;
                    tracking_number?: string | null;
                    delivered_at?: string | null;
                    created_at?: string;
                };
            };
            delivery_requests: {
                Row: {
                    id: string;
                    delivery_id: string;
                    status: 'pending_acceptance' | 'accepted' | 'expired' | 'cancelled';
                    expires_at: string | null;
                    created_at: string;
                    accepted_at: string | null;
                    accepted_by_rider_id: string | null;
                };
                Insert: {
                    id?: string;
                    delivery_id: string;
                    status?: 'pending_acceptance' | 'accepted' | 'expired' | 'cancelled';
                    expires_at?: string | null;
                    created_at?: string;
                    accepted_at?: string | null;
                    accepted_by_rider_id?: string | null;
                };
                Update: {
                    id?: string;
                    delivery_id?: string;
                    status?: 'pending_acceptance' | 'accepted' | 'expired' | 'cancelled';
                    expires_at?: string | null;
                    created_at?: string;
                    accepted_at?: string | null;
                    accepted_by_rider_id?: string | null;
                };
            };
            rider_delivery_responses: {
                Row: {
                    id: string;
                    delivery_request_id: string;
                    rider_id: string;
                    action: 'accepted' | 'rejected';
                    response_timestamp: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    delivery_request_id: string;
                    rider_id: string;
                    action: 'accepted' | 'rejected';
                    response_timestamp?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    delivery_request_id?: string;
                    rider_id?: string;
                    action?: 'accepted' | 'rejected';
                    response_timestamp?: string;
                    created_at?: string;
                };
            };
        };
    };
}
