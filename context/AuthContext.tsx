import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { devError, devLog } from '../lib/devLog';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_public: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string, stayLoggedIn: boolean) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshAuth: async () => {},
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
});

const STAY_LOGGED_IN_KEY = 'votioo_stay_logged_in';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        devLog('Profile not found:', error.message);
        return;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      devError('Profile fetch exception:', error);
    }
  };

  const createProfile = async (userId: string, username?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username || `user_${userId.slice(0, 8)}`,
          is_public: true,
        })
        .select()
        .single();

      if (error) {
        devError('Profile creation error:', error.message);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      devError('Profile creation exception:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshAuth = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
    } catch (error) {
      devError('Refresh auth error:', error);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { error: 'Username already taken' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        await createProfile(data.user.id, username);
        return { error: null };
      }

      return { error: 'Unknown error during sign up' };
    } catch (error: any) {
      devError('Sign up exception:', error);
      return { error: error?.message || 'An error occurred' };
    }
  };

  const signIn = async (email: string, password: string, stayLoggedIn: boolean) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session && data.user) {
        if (stayLoggedIn) {
          await AsyncStorage.setItem(STAY_LOGGED_IN_KEY, 'true');
        } else {
          await AsyncStorage.removeItem(STAY_LOGGED_IN_KEY);
        }

        await fetchProfile(data.user.id);
        return { error: null };
      }

      return { error: 'Unknown error during sign in' };
    } catch (error: any) {
      devError('Sign in exception:', error);
      return { error: error?.message || 'An error occurred' };
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          devError('Session fetch error:', error.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          } else {
            setProfile(null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        devError('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(STAY_LOGGED_IN_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      devError('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, refreshAuth, signUp, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
