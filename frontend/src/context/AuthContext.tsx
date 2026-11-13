import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '@/services/supabase/client';
import {
  getCurrentUserProfile,
  signInWithEmail,
  signUpWithEmail,
  signInWithGithub,
  signOutUser,
  type SignUpPayload,
} from '@/services/api/auth';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    payload: SignUpPayload
  ) => Promise<{ error: Error | null; requiresEmailVerification?: boolean }>;
  signInGithub: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const saveProfile = useCallback((p: UserProfile | null) => {
    setProfile(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { profile: current } = await getCurrentUserProfile();
      saveProfile(current);
    } catch {
      saveProfile(null);
    } finally {
      setLoading(false);
    }
  }, [saveProfile]);

  useEffect(() => {
    let mounted = true;

    // Fetch initial profile in background (never blocks UI if cached)
    void getCurrentUserProfile().then(({ profile: current }) => {
      if (mounted) {
        saveProfile(current);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        saveProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { profile: current } = await getCurrentUserProfile();
        if (mounted) {
          saveProfile(current);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [saveProfile]);

  const signIn = async (email: string, password: string) => {
    const { profile: loggedIn, error } = await signInWithEmail(email, password);
    if (!error && loggedIn) {
      saveProfile(loggedIn);
    }
    return { error };
  };

  const signUp = async (payload: SignUpPayload) => {
    const {
      profile: created,
      error,
      requiresEmailVerification,
    } = await signUpWithEmail(payload);
    if (!error && created) {
      saveProfile(created);
    }
    return { error, requiresEmailVerification };
  };

  const signInGithub = async () => {
    const { error } = await signInWithGithub();
    return { error };
  };

  const signOut = async () => {
    await signOutUser();
    saveProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        isAuthenticated: Boolean(profile),
        signIn,
        signUp,
        signInGithub,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
