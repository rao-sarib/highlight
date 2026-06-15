import { LogoGlyph } from "@/components/global/Logo";

/**
 * Premium hero graphic — a "citation constellation": the brand orb at the center
 * with the AI engines as labelled nodes orbiting it, connected by drawn lines.
 * Pure markup + CSS (no mock UI, no fabricated data).
 *
 * Note: positioning translate (-translate-1/2) and the float animation must live
 * on SEPARATE elements — an animation's `transform` overrides Tailwind's
 * translate, which would knock centred elements off-centre.
 */
const engines = [
  { name: "ChatGPT", x: 16, y: 16, delay: "0ms" },
  { name: "Perplexity", x: 84, y: 22, delay: "180ms" },
  { name: "Gemini", x: 82, y: 80, delay: "360ms" },
  { name: "Google AI Overview", x: 16, y: 82, delay: "540ms" },
];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-12 animate-glow-pulse rounded-full bg-brand-gradient opacity-25 blur-3xl"
      />

      {/* Connector lines from the orb to each engine node */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="hlLink" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        {engines.map((e) => (
          <line
            key={e.name}
            x1="50"
            y1="50"
            x2={e.x}
            y2={e.y}
            stroke="url(#hlLink)"
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity="0.4"
            pathLength={1}
            strokeDasharray={1}
            className="animate-draw-line"
          />
        ))}
      </svg>

      {/* Static orbital rings */}
      <div aria-hidden="true" className="absolute inset-2 rounded-full border border-primary/10" />
      <div aria-hidden="true" className="absolute inset-[24%] rounded-full border border-border/50" />

      {/* Orbiting accent dots */}
      <div aria-hidden="true" className="absolute inset-0 animate-spin-slow">
        <span className="absolute left-1/2 top-[3%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent shadow-glow" />
        <span className="absolute bottom-[8%] right-[18%] h-2 w-2 rounded-full bg-primary shadow-glow" />
      </div>

      {/* Engine nodes (name integrated into the graphic) */}
      {engines.map((e) => (
        <div
          key={e.name}
          style={{ left: `${e.x}%`, top: `${e.y}%` }}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        >
          <div style={{ animationDelay: e.delay }} className="animate-float">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/95 shadow-soft backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-gradient" />
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[0.72rem] font-semibold text-foreground">
                {e.name}
              </span>
            </span>
          </div>
        </div>
      ))}

      {/* Center brand orb — positioning on the outer div, float on the inner */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-40 w-40 animate-float items-center justify-center rounded-full bg-brand-gradient shadow-glow-lg sm:h-48 sm:w-48">
          <div
            aria-hidden="true"
            className="absolute left-7 top-6 h-16 w-16 rounded-full bg-white/30 blur-2xl"
          />
          <div aria-hidden="true" className="absolute inset-3 rounded-full ring-1 ring-inset ring-white/20" />
          <LogoGlyph className="relative h-20 w-20 text-white drop-shadow-[0_8px_28px_rgba(11,18,32,0.35)]" />
        </div>
      </div>
    </div>
  );
}
