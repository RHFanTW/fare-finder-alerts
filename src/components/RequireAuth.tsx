import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthUserContext = createContext<User | null>(null);

// Consumed by pages rendered under <RequireAuth>, e.g. the dashboard's
// "Hi {user.email}," greeting — mirrors the old Route.useRouteContext() usage.
export function useAuthUser(): User {
  const user = useContext(AuthUserContext);
  if (!user) {
    throw new Error("useAuthUser must be used within <RequireAuth>");
  }
  return user;
}

type Status =
  { state: "checking" } | { state: "authenticated"; user: User } | { state: "unauthenticated" };

// Client-side equivalent of the old `_authenticated` route's beforeLoad guard
// (it was already ssr: false, so this was always a client-only check).
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<Status>({ state: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setStatus({ state: "unauthenticated" });
        return;
      }
      setStatus({ state: "authenticated", user: data.user });
    }

    setStatus({ state: "checking" });
    void check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setStatus({ state: "unauthenticated" });
      } else {
        setStatus({ state: "authenticated", user: session.user });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  if (status.state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status.state === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  return <AuthUserContext.Provider value={status.user}>{children}</AuthUserContext.Provider>;
}
