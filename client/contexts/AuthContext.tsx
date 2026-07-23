import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const supabase = await getSupabaseBrowserClientAsync();
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
            }
          }
        );

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated: !!session,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
