import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
      console.log('👤 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.log('⚠️ Profile not found:', error.message);
        return;
      }
      
      if (data) {
        console.log('✅ Profile found:', data.username);
        setProfile(data);
      }
    } catch (error) {
      console.log('❌ Profile fetch exception:', error);
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
        console.log('❌ Profile creation error:', error.message);
        return;
      }

      if (data) {
        console.log('✅ Profile created:', data.username);
        setProfile(data);
      }
    } catch (error) {
      console.log('❌ Profile creation exception:', error);
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
      console.log('❌ Refresh auth error:', error);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('📝 Signing up user:', email);
      
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
        console.log('❌ Sign up error:', error.message);
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ User signed up:', data.user.email);
        await createProfile(data.user.id, username);
        return { error: null };
      }

      return { error: 'Unknown error during sign up' };
    } catch (error: any) {
      console.log('❌ Sign up exception:', error);
      return { error: error?.message || 'An error occurred' };
    }
  };

  const signIn = async (email: string, password: string, stayLoggedIn: boolean) => {
    try {
      console.log('🔐 Signing in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        console.log('❌ Sign in error:', error.message);
        return { error: error.message };
      }

      if (data.session && data.user) {
        console.log('✅ User signed in:', data.user.email);
        
        if (stayLoggedIn) {
          await AsyncStorage.setItem(STAY_LOGGED_IN_KEY, 'true');
          console.log('💾 Stay logged in enabled');
        } else {
          await AsyncStorage.removeItem(STAY_LOGGED_IN_KEY);
        }

        await fetchProfile(data.user.id);
        return { error: null };
      }

      return { error: 'Unknown error during sign in' };
    } catch (error: any) {
      console.log('❌ Sign in exception:', error);
      return { error: error?.message || 'An error occurred' };
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('❌ Session fetch error:', error.message);
        }

        if (mounted) {
          console.log('✅ Session found:', !!initialSession);
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
        console.log('❌ Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔔 Auth state changed:', event);
      
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
      console.log('🔓 Signing out...');
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(STAY_LOGGED_IN_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.log('❌ Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, refreshAuth, signUp, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
