import { Link, useNavigate } from "react-router-dom";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/components/RequireAuth";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export function DashboardPage() {
  const user = useAuthUser();
  const navigate = useNavigate();

  useDocumentMeta("Dashboard — Flight Price Notifier", [
    { name: "description", content: "Your flight route tracking dashboard." },
    { property: "og:title", content: "Dashboard — Flight Price Notifier" },
    { property: "og:description", content: "Your flight route tracking dashboard." },
    { name: "robots", content: "noindex" },
  ]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-gradient shadow-glow">
              <Plane className="size-4 text-primary-foreground" />
            </span>
            Flight Price Notifier
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out / 登出
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <div className="relative text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hi {user.email},</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            你的航線追蹤儀表板即將上線 — 下一個里程碑會加上訂閱航線的功能。
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/80">
            Your dashboard is coming soon. Route-subscription will be added in the next milestone.
          </p>
        </div>
      </main>
    </div>
  );
}
