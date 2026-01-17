// hooks/useSession.js - FINAL: userEmail ALWAYS from localStorage
import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

export function useSession() {
  const [session, setSession] = useState({
    userId: null,
    userEmail: null,
    userName: null,
    storeId: null,
    ownerId: null,
    user: null,
    loading: true,
  });

  const fetchUserName = async (email) => {
    if (!email) return null;
    try {
      // Try fetching from store_users first (most common for team members)
      const { data: storeUser } = await supabase
        .from('store_users')
        .select('full_name')
        .eq('email_address', email)
        .maybeSingle();

      if (storeUser?.full_name) return storeUser.full_name;

      // Try admins table
      const { data: admin } = await supabase
        .from('admins')
        .select('full_name')
        .eq('email', email)
        .maybeSingle();

      if (admin?.full_name) return admin.full_name;

      // Try stores table (for owners)
      const { data: store } = await supabase
        .from('stores')
        .select('full_name')
        .eq('email_address', email)
        .maybeSingle();

      if (store?.full_name) return store.full_name;

      return email.split('@')[0]; // Final fallback
    } catch (e) {
      return email.split('@')[0];
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storeId = localStorage.getItem("store_id");
        const ownerId = localStorage.getItem("owner_id");
        const userEmail = localStorage.getItem("user_email");

        const userName = await fetchUserName(userEmail);

        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        setSession({
          userId: authSession?.user?.id ?? null,
          userEmail: userEmail,
          userName: userName,
          storeId: storeId ? Number(storeId) : null,
          ownerId: ownerId ? Number(ownerId) : null,
          user: authSession?.user ?? null,
          loading: false,
        });
      } catch (error) {
        console.error("Session load error:", error);
        setSession((prev) => ({ ...prev, loading: false }));
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      const storeId = localStorage.getItem("store_id");
      const ownerId = localStorage.getItem("owner_id");
      const userEmail = localStorage.getItem("user_email");

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const userName = await fetchUserName(userEmail);
        setSession({
          userId: authSession?.user?.id ?? null,
          userEmail: userEmail,
          userName: userName,
          storeId: storeId ? Number(storeId) : null,
          ownerId: ownerId ? Number(ownerId) : null,
          user: authSession?.user ?? null,
          loading: false,
        });
      }

      if (event === "SIGNED_OUT") {
        setSession({
          userId: null,
          userEmail: userEmail,
          userName: null,
          storeId: null,
          ownerId: null,
          user: null,
          loading: false,
        });
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return session;
}
