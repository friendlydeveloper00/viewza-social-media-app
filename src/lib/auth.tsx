import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithEmailOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithPhoneOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (token: string, type: "email" | "sms", emailOrPhone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADING_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const finishAuthLoading = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const resetBrokenSession = async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
      } finally {
        finishAuthLoading(null);
      }
    };

    const loadingTimeout = window.setTimeout(() => {
      finishAuthLoading(null);
    }, AUTH_LOADING_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.clearTimeout(loadingTimeout);
      finishAuthLoading(session);
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        window.clearTimeout(loadingTimeout);

        if (error) {
          await resetBrokenSession();
          return;
        }

        finishAuthLoading(session);
      })
      .catch(async () => {
        window.clearTimeout(loadingTimeout);
        await resetBrokenSession();
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: username },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithEmailOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error: error as Error | null };
  };

  const verifyOtp = async (token: string, type: "email" | "sms", emailOrPhone: string) => {
    let params: any;
    if (type === "email") {
      params = { token, type: "email" as const, email: emailOrPhone };
    } else {
      params = { token, type: "sms" as const, phone: emailOrPhone };
    }
    const { error } = await supabase.auth.verifyOtp(params);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signInWithEmailOtp, signInWithPhoneOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
