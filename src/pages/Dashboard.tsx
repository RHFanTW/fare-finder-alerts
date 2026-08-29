import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plane, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/components/RequireAuth";
import { useDocumentMeta } from "@/hooks/use-document-meta";

const API_URL =
  (import.meta.env["VITE_FLIGHT_API_URL"] as string | undefined) ||
  "https://9575d6reh2.execute-api.us-east-1.amazonaws.com";

const PLANS = [
  {
    plan_name: "tokyo",
    route: "TPE-TYO",
    title: "台北 -> 東京",
    subtitle: "Taipei to Tokyo",
    hint: "近期低價約 NT$9,325",
    defaultTarget: 10000,
  },
  {
    plan_name: "seoul",
    route: "TPE-SEL",
    title: "台北 -> 首爾",
    subtitle: "Taipei to Seoul",
    hint: "近期低價約 NT$5,989",
    defaultTarget: 7000,
  },
] as const;

type PlanName = (typeof PLANS)[number]["plan_name"];

type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number;
  currency: "TWD";
  updated_at?: string;
};

export function DashboardPage() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<Record<PlanName, string>>({
    tokyo: String(PLANS[0].defaultTarget),
    seoul: String(PLANS[1].defaultTarget),
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<PlanName | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta("Dashboard — Flight Price Notifier", [
    { name: "description", content: "Your flight route tracking dashboard." },
    { property: "og:title", content: "Dashboard — Flight Price Notifier" },
    { property: "og:description", content: "Your flight route tracking dashboard." },
    { name: "robots", content: "noindex" },
  ]);

  const subscriptionsByPlan = useMemo(() => {
    return Object.fromEntries(subscriptions.map((item) => [item.plan_name, item])) as Partial<
      Record<PlanName, Subscription>
    >;
  }, [subscriptions]);

  async function loadSubscriptions() {
    if (!API_URL) {
      setError("Missing VITE_FLIGHT_API_URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/subscriptions?email=${encodeURIComponent(user.email ?? "")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load subscriptions.");
      const rows = (data.subscriptions || []) as Subscription[];
      setSubscriptions(rows);
      setTargets((current) => {
        const next = { ...current };
        for (const row of rows) next[row.plan_name] = String(row.target_price);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubscriptions();
  }, [user.email]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  async function saveSubscription(plan: (typeof PLANS)[number]) {
    if (!API_URL) {
      setError("Missing VITE_FLIGHT_API_URL.");
      return;
    }
    const target = Number(targets[plan.plan_name]);
    if (!Number.isFinite(target) || target <= 0) {
      setError("請輸入有效的 TWD 目標價。");
      return;
    }

    setSavingPlan(plan.plan_name);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          plan_name: plan.plan_name,
          target_price: target,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save subscription.");
      await loadSubscriptions();
      setMessage(`${plan.title} 已開始追蹤，目標價 NT$${target.toLocaleString("en-US")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save subscription.");
    } finally {
      setSavingPlan(null);
    }
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

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Flight watchlist</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Hi {user.email},
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                選一條航線和你的 TWD 目標價；每 30 分鐘自動檢查，達標就寄 email。
              </p>
            </div>
            <Button variant="outline" onClick={loadSubscriptions} disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {PLANS.map((plan) => {
              const subscription = subscriptionsByPlan[plan.plan_name];
              const isSaving = savingPlan === plan.plan_name;
              return (
                <Card key={plan.plan_name} className="overflow-hidden rounded-lg shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl">{plan.title}</CardTitle>
                        <CardDescription>{plan.subtitle}</CardDescription>
                      </div>
                      {subscription ? (
                        <Badge className="shrink-0 gap-1">
                          <CheckCircle2 className="size-3.5" />
                          已訂閱
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.hint}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${plan.plan_name}-target`}>TWD 目標價</Label>
                      <Input
                        id={`${plan.plan_name}-target`}
                        inputMode="numeric"
                        min={1}
                        type="number"
                        value={targets[plan.plan_name]}
                        onChange={(event) =>
                          setTargets((current) => ({
                            ...current,
                            [plan.plan_name]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    {subscription ? (
                      <p className="text-sm text-muted-foreground">
                        目前目標價 NT${Number(subscription.target_price).toLocaleString("en-US")}，
                        最後更新 {subscription.updated_at ? new Date(subscription.updated_at).toLocaleString() : "剛剛"}。
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        達到或低於這個價格時，我們會寄通知到你的登入 email。
                      </p>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => saveSubscription(plan)}
                      disabled={isSaving || loading}
                    >
                      {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {subscription ? "更新目標價" : "開始追蹤"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
