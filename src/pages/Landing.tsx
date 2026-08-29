import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Radar, MailCheck, CalendarX2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/use-document-meta";

const FEATURES = [
  {
    icon: Radar,
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    icon: MailCheck,
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    icon: CalendarX2,
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

export function LandingPage() {
  const ref = useRef<HTMLDivElement>(null);

  useDocumentMeta("Flight Price Notifier — 機票降價通知", [
    {
      name: "description",
      content:
        "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
    },
    { property: "og:title", content: "Flight Price Notifier — 機票降價通知" },
    {
      property: "og:description",
      content:
        "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
    },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset["visible"] = "true";
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-gradient shadow-glow">
              <Plane className="size-4 text-primary-foreground" />
            </span>
            Flight Price Notifier
          </Link>
          <Button asChild size="sm" className="shadow-glow">
            <Link to="/auth">Sign in / 登入</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-32">
          <p data-reveal className="reveal mb-4 text-sm font-medium tracking-wide text-primary">
            機票降價通知
          </p>
          <h1
            data-reveal
            className="reveal text-balance text-4xl font-bold tracking-tight sm:text-6xl"
            style={{ transitionDelay: "80ms" }}
          >
            Flight Price Notifier
          </h1>
          <p
            data-reveal
            className="reveal mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
            style={{ transitionDelay: "160ms" }}
          >
            設定航線與目標價，機票降價就通知你。
          </p>
          <p
            data-reveal
            className="reveal mx-auto mt-3 max-w-2xl text-sm text-muted-foreground/80"
            style={{ transitionDelay: "220ms" }}
          >
            Set a route and a target price — we email you when the fare drops.
          </p>
          <div
            data-reveal
            className="reveal mt-10 flex justify-center"
            style={{ transitionDelay: "300ms" }}
          >
            <Button asChild size="lg" className="shadow-glow">
              <Link to="/auth">Sign in / 登入</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              data-reveal
              className="reveal rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-violet-gradient shadow-glow">
                <f.icon className="size-5 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-semibold">
                {f.title}
                <span className="block text-sm font-normal text-muted-foreground">
                  {f.subtitle}
                </span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <p className="text-center text-sm text-muted-foreground">© 2026 Flight Price Notifier</p>
      </footer>
    </div>
  );
}
