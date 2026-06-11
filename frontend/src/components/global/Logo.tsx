import type { SVGProps } from "react";

/**
 * Highlight brand mark — "Highlighted Growth" (rising rankings + a highlighter
 * swipe + the top-spot dot). Self-contained dark tile; drop in anywhere and
 * size it with a className (e.g. `h-9 w-9`).
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Highlight"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="hlLogoGrad" x1="8" y1="46" x2="52" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6F55EE" />
          <stop offset="1" stopColor="#1BC8E8" />
        </linearGradient>
        <linearGradient id="hlLogoTile" x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#161722" />
          <stop offset="1" stopColor="#0A0B11" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="18" fill="url(#hlLogoTile)" />
      <rect x="3.5" y="3.5" width="57" height="57" rx="17.5" fill="none" stroke="#ffffff" strokeOpacity="0.1" />
      <g transform="translate(32 32) scale(0.8) translate(-29.6 -30.3)">
        <rect x="13" y="36" width="8" height="15" rx="3" fill="#ffffff" opacity="0.55" />
        <rect x="26" y="28" width="8" height="23" rx="3" fill="#ffffff" opacity="0.78" />
        <rect x="39" y="19" width="8" height="32" rx="3" fill="#ffffff" />
        <rect x="7" y="14" width="52" height="12" rx="6" fill="url(#hlLogoGrad)" opacity="0.88" transform="rotate(-22 32 26)" />
        <circle cx="48" cy="14" r="4.3" fill="url(#hlLogoGrad)" />
        <circle cx="48" cy="14" r="1.7" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * Monochrome glyph version (no tile) — inherits the current text color via
 * `currentColor`. Use inside coloured/frosted containers (e.g. on the gradient
 * auth panels). Size with a className.
 */
export function LogoGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Highlight"
      className={className}
      {...props}
    >
      <g fill="currentColor">
        <rect x="13" y="36" width="8" height="15" rx="3" opacity="0.6" />
        <rect x="26" y="28" width="8" height="23" rx="3" opacity="0.8" />
        <rect x="39" y="19" width="8" height="32" rx="3" />
        <rect x="7" y="14" width="52" height="12" rx="6" opacity="0.4" transform="rotate(-22 32 26)" />
        <circle cx="48" cy="14" r="4.3" />
      </g>
    </svg>
  );
}
