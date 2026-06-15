"use client";

import { useEffect, useState } from "react";

import api from "@/lib/api";

export interface BillingPlan {
  key: string;
  name: string;
  price_monthly: number;
  max_projects: number;
  max_crawl_pages: number;
  monthly_scan_quota: number;
  engines: string[];
  features: string[];
  blurb: string;
  purchasable: boolean;
}

export interface BillingMe {
  plan: BillingPlan;
  usage: { used: number; quota: number; period: string; remaining: number };
  projects_used: number;
  projects_limit: number;
  stripe_enabled: boolean;
  role: string;
  role_features: string[];
}

// Module-level cache so navigating between feature pages doesn't refetch.
let cache: Promise<BillingMe> | null = null;

export function fetchBillingMe(force = false): Promise<BillingMe> {
  if (!cache || force) {
    cache = api.get<BillingMe>("/billing/me").then((r) => r.data);
  }
  return cache;
}

export function clearBillingCache(): void {
  cache = null;
}

/** React hook: current plan + usage, cached across the app. */
export function useBilling(): { me: BillingMe | null; loading: boolean } {
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchBillingMe()
      .then((data) => {
        if (active) setMe(data);
      })
      .catch(() => {
        // If billing can't be read, fail open (don't hard-block the UI).
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { me, loading };
}
