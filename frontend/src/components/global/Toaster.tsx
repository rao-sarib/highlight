"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useToastStore } from "@/store/toastStore";

const META = {
  success: { Icon: CheckCircle2, cls: "border-success/40 text-success" },
  error: { Icon: AlertCircle, cls: "border-destructive/40 text-destructive" },
  info: { Icon: Info, cls: "border-primary/40 text-primary" },
} as const;

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((t) => {
        const { Icon, cls } = META[t.kind];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-soft backdrop-blur ${cls}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm leading-5 text-foreground">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
