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

  useEffect(() => {
    // Check active sessions and get user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function getProfile(userId: string) {
    console.log('Fetching profile for user:', userId);

    // Get the current user's metadata
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log('Current user metadata:', currentUser?.user_metadata);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      console.error('Failed to fetch profile for user:', userId);
      return;
    }

    console.log('Profile role accessed:', {
      userId,
      role: data.role,
      metadata_role: currentUser?.user_metadata?.role,
      timestamp: new Date().toISOString(),
    });

    if (data.role !== currentUser?.user_metadata?.role) {
      console.warn('Role mismatch detected:', {
        profile_role: data.role,
        metadata_role: currentUser?.user_metadata?.role
      });
    }

    setProfile(data);
  }

  async function signUp(email: string, password: string, role: 'customer' | 'manager') {
    console.log('Attempting to create account with role:', role);
    
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
    console.log('Account created successfully with role:', role);
  }

  async function signIn(email: string, password: string) {
    console.log('Attempting to sign in user:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in failed:', error.message);
      throw error;
    }    
    console.log('Sign in successful for user:', email);
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