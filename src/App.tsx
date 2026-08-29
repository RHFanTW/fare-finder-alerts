import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { NotFound } from "@/components/NotFound";
import { LandingPage } from "@/pages/Landing";
import { AuthPage } from "@/pages/Auth";
import { DashboardPage } from "@/pages/Dashboard";

// Invalidates cached queries on sign-in/out, same as the old root route's
// supabase.auth.onAuthStateChange effect.
function AuthQueryInvalidator({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}

export function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthQueryInvalidator queryClient={queryClient} />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
