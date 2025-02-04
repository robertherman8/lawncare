import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, role: 'customer' | 'manager') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cleanup function type
  type Cleanup = () => void;

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setLoading(true);
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        // Log session state
        console.log('Auth initialized:', { 
          hasSession: !!session,
          userId: session?.user?.id 
        });

        // Set user state
        if (mounted) {
          setUser(session?.user ?? null);
        }
        
        // Get profile if user exists
        if (session?.user) {
          try {
            const profile = await getProfile(session.user.id);
            if (mounted && profile) {
              setProfile(profile);
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', { 
        event: _event,
        userId: session?.user?.id 
      });

      if (mounted) {
        setUser(session?.user ?? null);
      }
      
      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id);
          if (mounted && profile) {
            setProfile(profile);
          }
        } catch (err) {
          console.error('Error fetching profile on auth change:', err);
        }
      } else {
        if (mounted) {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function getProfile(userId: string) {
    try {
      if (!userId) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error in getProfile:', err);
      return null;
    }
  }

  async function signUp(email: string, password: string, role: 'customer' | 'manager') {
    // Validate role before signup
    if (role !== 'customer' && role !== 'manager') {
      throw new Error('Invalid role specified');
    }

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } }
    });

    if (signUpError) throw signUpError;
  }

  async function signIn(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password'
            : error.message
        );
      }

      if (!data.user) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Get profile immediately after successful sign in
      try {
        const profile = await getProfile(data.user.id);
        if (!profile) {
          throw new Error('Unable to load user profile');
        }
      } catch (profileError) {
        console.error('Error fetching profile after login:', profileError);
        throw new Error('Unable to load user profile. Please try again.');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      throw new Error(message);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    user,
    profile,
    signUp,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}