/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/userService';
import { mapAuthError, toFriendlyError } from '@/lib/authErrors';

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
  const fetchingProfileRef = useRef<string | null>(null);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    if (fetchingProfileRef.current === authUser.id) return;
    if (userRef.current?.id === authUser.id) return;

    fetchingProfileRef.current = authUser.id;
    setLoading(true);

    try {
      let profile = await getUserProfile(authUser.id);

      // Self-heal: create profile if missing
      if (!profile) {
        const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
        const allowedRoles: UserRole[] = ['admin', 'customer', 'business', 'rider'];
        const metaRole = typeof meta.role === 'string' ? meta.role : undefined;
        const resolvedRole: UserRole =
          metaRole && (allowedRoles as string[]).includes(metaRole)
            ? (metaRole as UserRole)
            : 'customer';
        const resolvedName =
          (typeof meta.name === 'string' && meta.name) ||
          (authUser.email ? authUser.email.split('@')[0] : 'User');
        const resolvedPhone =
          typeof meta.phone === 'string' && meta.phone ? meta.phone : null;

        const { error: insertError } = await supabase.from('profiles').insert({
          id: authUser.id,
          email: authUser.email || '',
          name: resolvedName,
          role: resolvedRole,
          phone: resolvedPhone,
          is_available: resolvedRole === 'rider' ? true : null,
        });

        if (insertError) {
          console.error('Failed to auto-create profile:', insertError);
        } else {
          profile = await getUserProfile(authUser.id);
        }
      }

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
      } else {
        userRef.current = null;
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      userRef.current = null;
      setUser(null);
      throw error;
    } finally {
      fetchingProfileRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialEventHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          if (userRef.current?.id === session.user.id) {
            if (!initialEventHandled) {
              initialEventHandled = true;
              setLoading(false);
            }
            return;
          }
          if (fetchingProfileRef.current === session.user.id) return;

          const authUser = session.user;
          setTimeout(() => {
            if (!mounted) return;
            fetchUserProfile(authUser)
              .catch(() => {})
              .finally(() => {
                if (!initialEventHandled && mounted) {
                  initialEventHandled = true;
                  setLoading(false);
                }
              });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          fetchingProfileRef.current = null;
          userRef.current = null;
          setUser(null);
          if (!initialEventHandled) {
            initialEventHandled = true;
            setLoading(false);
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          userRef.current = null;
          setUser(null);
          if (!initialEventHandled) {
            initialEventHandled = true;
            setLoading(false);
          }
        }
      }
    );

    supabase.auth.getSession();

    const timeout = setTimeout(() => {
      if (!initialEventHandled && mounted) {
        initialEventHandled = true;
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail || !password) {
        setLoading(false);
        const err = new Error('Please enter both email and password.') as Error & {
          kind: string;
        };
        err.kind = 'invalid_credentials';
        throw err;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setLoading(false);
        throw toFriendlyError(error);
      }

      if (!data.user) {
        setLoading(false);
        throw toFriendlyError(new Error('No user data returned from login'));
      }

      try {
        await fetchUserProfile(data.user);
      } catch (profileErr) {
        throw toFriendlyError(profileErr);
      }
    } catch (error: unknown) {
      setLoading(false);
      const e = error as { kind?: string };
      if (e && typeof e.kind === 'string') {
        throw error;
      }
      throw toFriendlyError(error);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      userRef.current = null;
      setUser(null);
      fetchingProfileRef.current = null;
    } catch (error: unknown) {
      console.error('Logout error:', error);
      throw toFriendlyError(error);
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
