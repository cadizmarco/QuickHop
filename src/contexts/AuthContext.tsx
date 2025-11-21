/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/userService';

export type UserRole = 'admin' | 'customer' | 'business' | 'rider';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export hook first to help with Fast Refresh
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const fetchingProfileRef = useRef<string | null>(null); // Track which user ID is currently being fetched

  // Fetch user profile from database
  const fetchUserProfile = async (authUser: SupabaseUser) => {
    // Prevent duplicate fetches for the same user
    if (fetchingProfileRef.current === authUser.id) {
      console.log('Profile fetch already in progress for user:', authUser.id);
      return;
    }

    // If we already have this user's profile, skip fetching
    if (userRef.current?.id === authUser.id) {
      console.log('User profile already loaded, skipping fetch');
      return;
    }

    fetchingProfileRef.current = authUser.id;
    setLoading(true);

    try {
      console.log('Fetching profile for user:', authUser.id);
      const profile = await getUserProfile(authUser.id);

      if (profile) {
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          phone: profile.phone || undefined,
        };
        userRef.current = userData;
        setUser(userData);
        console.log('Profile fetched successfully:', userData.email, userData.role);
      } else {
        console.error('No profile found for user:', authUser.id);
        userRef.current = null;
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      userRef.current = null;
      setUser(null);
      throw error; // Re-throw to allow caller to handle
    } finally {
      fetchingProfileRef.current = null;
      setLoading(false);
    }
  };

  // Check for existing session on mount
  // Note: With persistSession: false, there should be no session to restore
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for session (should be null with persistSession: false)
        const { data: { session } } = await supabase.auth.getSession();

        // Only restore session if it exists (shouldn't happen with persistSession: false)
        if (session?.user && mounted) {
          console.log('Session found on mount, restoring...');
          await fetchUserProfile(session.user);
        } else {
          // No session found - user needs to log in
          console.log('No session found, user must log in');
          userRef.current = null;
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // On error, clear user state
        userRef.current = null;
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Cleanup on tab close/unload
    const handleBeforeUnload = () => {
      // Clear any potential session data
      userRef.current = null;
      setUser(null);
      fetchingProfileRef.current = null;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only fetch profile if we don't already have it (avoids duplicate fetch after login)
          // The login() function already fetches the profile, so we skip here if it's the same user
          if (userRef.current?.id === session.user.id) {
            console.log('User profile already loaded, skipping duplicate fetch from auth state change');
            return;
          }
          
          // Only fetch if not currently fetching
          if (fetchingProfileRef.current !== session.user.id) {
            console.log('Fetching profile for signed in user from auth state change...');
            try {
              await fetchUserProfile(session.user);
            } catch (error) {
              console.error('Failed to fetch profile in auth state change:', error);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          fetchingProfileRef.current = null;
          userRef.current = null;
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // On token refresh, ensure we still have the profile
          if (!userRef.current || userRef.current.id !== session.user.id) {
            console.log('Token refreshed but profile missing, fetching...');
            try {
              await fetchUserProfile(session.user);
            } catch (error) {
              console.error('Failed to fetch profile on token refresh:', error);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('SignIn response:', { user: data.user?.id, error: error?.message });

      if (error) {
        setLoading(false);
        throw error;
      }

      if (!data.user) {
        setLoading(false);
        throw new Error('No user data returned from login');
      }

      // Fetch profile immediately after successful login instead of waiting for auth state change
      console.log('Login successful, fetching user profile...');
      await fetchUserProfile(data.user);
      console.log('User profile fetched successfully');
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      // Don't clear user state if it's just a profile fetch error - auth succeeded
      if (error.message?.includes('profile') || error.message?.includes('PGRST')) {
        throw new Error('Login successful but failed to load profile. Please try again.');
      }
      throw new Error(error.message || 'Failed to login');
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all local state
      userRef.current = null;
      setUser(null);
      fetchingProfileRef.current = null;
      
      // Clear any remaining session data from storage (just in case)
      if (typeof window !== 'undefined') {
        // Clear all localStorage items that might contain auth data
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage as well
        sessionStorage.clear();
      }
      
      console.log('User logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}
