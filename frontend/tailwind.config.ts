import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 18px 60px -18px hsl(var(--primary) / 0.45)",
        "glow-lg": "0 30px 90px -24px hsl(var(--primary) / 0.55)",
        soft: "0 1px 2px hsl(var(--shadow-color) / 0.04), 0 8px 24px -12px hsl(var(--shadow-color) / 0.12)",
        card: "0 1px 0 0 hsl(var(--border)) , 0 12px 32px -20px hsl(var(--shadow-color) / 0.25)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)",
        "dot-pattern":
          "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
        "brand-gradient":
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
        "aurora":
          "radial-gradient(60% 60% at 15% 10%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(50% 50% at 90% 5%, hsl(var(--accent) / 0.16), transparent 55%), radial-gradient(50% 60% at 80% 100%, hsl(var(--primary) / 0.12), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(3%, -4%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-3%, 3%, 0) scale(0.96)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        blob: {
          "0%, 100%": { borderRadius: "42% 58% 63% 37% / 41% 44% 56% 59%" },
          "50%": { borderRadius: "58% 42% 38% 62% / 57% 64% 36% 43%" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(2deg)" },
        },
        "rise-bar": {
          "0%": { transform: "scaleY(0.15)", opacity: "0.4" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        "draw-line": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        "ping-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "80%, 100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "highlight-wipe": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2s infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease infinite",
        marquee: "marquee var(--marquee-duration, 32s) linear infinite",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "spin-slow": "spin-slow 26s linear infinite",
        blob: "blob 14s ease-in-out infinite",
        "ping-ring": "ping-ring 2.4s cubic-bezier(0,0,0.2,1) infinite",
        "rise-bar": "rise-bar 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
        "draw-line": "draw-line 2.2s ease forwards",
        "highlight-wipe": "highlight-wipe 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both",
      },
    },
  },
  plugins: [],
};

export default config;
