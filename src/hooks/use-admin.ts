import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const ADMIN_EMAIL = "riazriyan80@gmail.com";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check by email first (fallback if roles table doesn't exist yet)
    if (user.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    // Check user_roles table
    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!data && !error);
      } catch {
        // Table might not exist yet, fall back to email check
        setIsAdmin(user.email === ADMIN_EMAIL);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { isAdmin, loading };
}
