import { ArrowUpRight, Gauge, Search, Sparkles, TrendingUp } from "lucide-react";

const bars = [38, 54, 47, 68, 60, 82, 74, 92];

const navDots = [
  { active: true },
  { active: false },
  { active: false },
  { active: false },
  { active: false },
];

/**
 * A stylized, animated "product screenshot" of the Highlight dashboard.
 * Pure markup + CSS animations (no client JS) so it renders instantly and
 * adapts to light/dark via design tokens.
 */
export default function ProductPreview() {
  return (
    <div className="group perspective-1200">
      <div className="tilt-hero preserve-3d">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/90 shadow-glow-lg backdrop-blur-xl">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-destructive/70" />
            <span className="h-3 w-3 rounded-full bg-warning/80" />
            <span className="h-3 w-3 rounded-full bg-success/80" />
            <div className="ml-3 flex h-7 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 text-[0.7rem] text-muted-foreground">
              <Search className="h-3 w-3" />
              app.highlight.ai/dashboard
            </div>
            <div className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-ring rounded-full bg-success/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Live
            </div>
          </div>

          <div className="flex">
            {/* Mini sidebar */}
            <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-border/60 bg-muted/20 py-5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="mt-1 flex flex-col items-center gap-3">
                {navDots.map((d, i) => (
                  <span
                    key={i}
                    className={
                      d.active
                        ? "h-6 w-6 rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/30"
                        : "h-6 w-6 rounded-lg bg-foreground/5"
                    }
                  />
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1 space-y-4 p-5">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-2.5 w-28 rounded-full bg-foreground/15" />
                  <div className="mt-2 h-2 w-20 rounded-full bg-foreground/10" />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-[0.65rem] font-semibold text-white shadow-glow">
                  <Sparkles className="h-3 w-3" />
                  Run audit
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: Gauge, label: "AI Visibility", val: "92", tone: "primary" },
                  { icon: TrendingUp, label: "SEO Score", val: "87", tone: "accent" },
                  { icon: Search, label: "Keywords", val: "1.2k", tone: "success" },
                ].map(({ icon: Icon, label, val, tone }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border/60 bg-background/60 p-2.5"
                  >
                    <div
                      className={
                        "flex h-6 w-6 items-center justify-center rounded-lg " +
                        (tone === "primary"
                          ? "bg-primary/15 text-primary"
                          : tone === "accent"
                            ? "bg-accent/15 text-accent"
                            : "bg-success/15 text-success")
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-2 font-display text-lg font-semibold leading-none text-foreground">
                      {val}
                    </p>
                    <p className="mt-1 flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                      {label}
                      <ArrowUpRight className="h-2.5 w-2.5 text-success" />
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart card */}
              <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-24 rounded-full bg-foreground/15" />
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  </div>
                </div>

                {/* Animated bars + sparkline */}
                <div className="relative mt-3 h-24">
                  {/* Sparkline overlay */}
                  <svg
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    className="absolute inset-x-0 top-0 h-12 w-full"
                  >
                    <defs>
                      <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--accent))" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,30 C12,28 18,10 30,12 C42,14 50,26 62,22 C74,18 82,4 100,6"
                      fill="none"
                      stroke="url(#spark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      className="animate-draw-line"
                    />
                  </svg>

                  {/* Bars */}
                  <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-between gap-1.5">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
                        className="w-full origin-bottom animate-rise-bar rounded-t-md bg-gradient-to-t from-primary/30 to-primary/80"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
