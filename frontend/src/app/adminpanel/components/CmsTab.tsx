"use client";

/**
 * CMS tab — edits the landing-page content document.
 *
 * Extracted verbatim from the admin panel page; the JSX and handlers are
 * unchanged, with the page's CMS state passed in as props.
 */

import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import type { LandingContent } from "@/lib/landing";

import { ICON_OPTIONS } from "../constants";
import { Area, Card, Field } from "./FormControls";

export function CmsTab({
  content,
  updateContent,
  busy,
  cmsMsg,
  saveCms,
  resetCms,
}: {
  content: LandingContent;
  updateContent: (mut: (d: LandingContent) => void) => void;
  busy: boolean;
  cmsMsg: string;
  saveCms: () => Promise<void>;
  resetCms: () => Promise<void>;
}) {
  return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Landing page content</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void resetCms()}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" /> Reset to defaults
                </button>
                <button
                  type="button"
                  onClick={() => void saveCms()}
                  disabled={busy}
                  className="btn-brand inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </button>
              </div>
            </div>
            {cmsMsg ? <p className="text-sm text-muted-foreground">{cmsMsg}</p> : null}

            <Card title="Brand">
              <Field label="Site name" value={content.brand.name} onChange={(v) => updateContent((d) => { d.brand.name = v; })} />
            </Card>

            <Card title="Hero">
              <Field label="Badge" value={content.hero.badge} onChange={(v) => updateContent((d) => { d.hero.badge = v; })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Title (lead)" value={content.hero.titleLead} onChange={(v) => updateContent((d) => { d.hero.titleLead = v; })} />
                <Field label="Title (highlight)" value={content.hero.titleHighlight} onChange={(v) => updateContent((d) => { d.hero.titleHighlight = v; })} />
                <Field label="Title (tail)" value={content.hero.titleTail} onChange={(v) => updateContent((d) => { d.hero.titleTail = v; })} />
              </div>
              <Area label="Subtitle" value={content.hero.subtitle} onChange={(v) => updateContent((d) => { d.hero.subtitle = v; })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Primary CTA" value={content.hero.primaryCta} onChange={(v) => updateContent((d) => { d.hero.primaryCta = v; })} />
                <Field label="Secondary CTA" value={content.hero.secondaryCta} onChange={(v) => updateContent((d) => { d.hero.secondaryCta = v; })} />
              </div>
              <Field label="Note" value={content.hero.note} onChange={(v) => updateContent((d) => { d.hero.note = v; })} />
            </Card>

            <Card title="Engines strip">
              <Field label="Label" value={content.engines.label} onChange={(v) => updateContent((d) => { d.engines.label = v; })} />
              {content.engines.items.map((eng, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={eng}
                    onChange={(e) => updateContent((d) => { d.engines.items[i] = e.target.value; })}
                    className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <button type="button" onClick={() => updateContent((d) => { d.engines.items.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.engines.items.push("New engine"); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50">
                <Plus className="h-4 w-4" /> Add engine
              </button>
            </Card>

            <Card title="Facts (3 stat tiles)">
              {content.facts.map((f, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_2fr_auto]">
                  <input value={f.value} onChange={(e) => updateContent((d) => { d.facts[i].value = e.target.value; })} placeholder="Value" className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                  <input value={f.label} onChange={(e) => updateContent((d) => { d.facts[i].label = e.target.value; })} placeholder="Label" className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                  <button type="button" onClick={() => updateContent((d) => { d.facts.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.facts.push({ value: "", label: "" }); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50"><Plus className="h-4 w-4" /> Add fact</button>
            </Card>

            <Card title="Features section">
              <Field label="Eyebrow" value={content.features.eyebrow} onChange={(v) => updateContent((d) => { d.features.eyebrow = v; })} />
              <Field label="Title" value={content.features.title} onChange={(v) => updateContent((d) => { d.features.title = v; })} />
              <Area label="Subtitle" value={content.features.subtitle} onChange={(v) => updateContent((d) => { d.features.subtitle = v; })} />
              {content.features.items.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <select value={it.icon} onChange={(e) => updateContent((d) => { d.features.items[i].icon = e.target.value; })} className="h-10 rounded-lg border border-border bg-background px-2 text-sm focus:border-primary">
                      {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <input value={it.title} onChange={(e) => updateContent((d) => { d.features.items[i].title = e.target.value; })} placeholder="Title" className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input type="checkbox" checked={!!it.wide} onChange={(e) => updateContent((d) => { d.features.items[i].wide = e.target.checked; })} /> wide
                    </label>
                    <button type="button" onClick={() => updateContent((d) => { d.features.items.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea value={it.body} onChange={(e) => updateContent((d) => { d.features.items[i].body = e.target.value; })} placeholder="Body" className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary" />
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.features.items.push({ icon: "Gauge", title: "", body: "", wide: false }); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50"><Plus className="h-4 w-4" /> Add feature card</button>
            </Card>

            <Card title="How it works">
              <Field label="Eyebrow" value={content.steps.eyebrow} onChange={(v) => updateContent((d) => { d.steps.eyebrow = v; })} />
              <Field label="Title" value={content.steps.title} onChange={(v) => updateContent((d) => { d.steps.title = v; })} />
              <Area label="Subtitle" value={content.steps.subtitle} onChange={(v) => updateContent((d) => { d.steps.subtitle = v; })} />
              <Field label="CTA" value={content.steps.cta} onChange={(v) => updateContent((d) => { d.steps.cta = v; })} />
              {content.steps.items.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-3">
                  <div className="flex gap-2">
                    <input value={it.title} onChange={(e) => updateContent((d) => { d.steps.items[i].title = e.target.value; })} placeholder="Step title" className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                    <button type="button" onClick={() => updateContent((d) => { d.steps.items.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea value={it.body} onChange={(e) => updateContent((d) => { d.steps.items[i].body = e.target.value; })} placeholder="Step body" className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary" />
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.steps.items.push({ title: "", body: "" }); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50"><Plus className="h-4 w-4" /> Add step</button>
            </Card>

            <Card title="About section">
              <Field label="Eyebrow" value={content.about?.eyebrow ?? ""} onChange={(v) => updateContent((d) => { d.about.eyebrow = v; })} />
              <Field label="Title" value={content.about?.title ?? ""} onChange={(v) => updateContent((d) => { d.about.title = v; })} />
              <Area label="Body" value={content.about?.body ?? ""} onChange={(v) => updateContent((d) => { d.about.body = v; })} />
              {(content.about?.points ?? []).map((pt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={pt} onChange={(e) => updateContent((d) => { d.about.points[i] = e.target.value; })} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                  <button type="button" onClick={() => updateContent((d) => { d.about.points.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.about.points.push("New point"); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50"><Plus className="h-4 w-4" /> Add point</button>
            </Card>

            <Card title="Closing call-to-action">
              <Field label="Title" value={content.closing.title} onChange={(v) => updateContent((d) => { d.closing.title = v; })} />
              <Area label="Subtitle" value={content.closing.subtitle} onChange={(v) => updateContent((d) => { d.closing.subtitle = v; })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Primary CTA" value={content.closing.primaryCta} onChange={(v) => updateContent((d) => { d.closing.primaryCta = v; })} />
                <Field label="Secondary CTA" value={content.closing.secondaryCta} onChange={(v) => updateContent((d) => { d.closing.secondaryCta = v; })} />
              </div>
            </Card>

            <Card title="FAQ">
              <Field label="Eyebrow" value={content.faq.eyebrow} onChange={(v) => updateContent((d) => { d.faq.eyebrow = v; })} />
              <Field label="Title" value={content.faq.title} onChange={(v) => updateContent((d) => { d.faq.title = v; })} />
              {content.faq.items.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border/60 p-3">
                  <div className="flex gap-2">
                    <input value={it.q} onChange={(e) => updateContent((d) => { d.faq.items[i].q = e.target.value; })} placeholder="Question" className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                    <button type="button" onClick={() => updateContent((d) => { d.faq.items.splice(i, 1); })} className="rounded-lg border border-border px-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea value={it.a} onChange={(e) => updateContent((d) => { d.faq.items[i].a = e.target.value; })} placeholder="Answer" className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary" />
                </div>
              ))}
              <button type="button" onClick={() => updateContent((d) => { d.faq.items.push({ q: "", a: "" }); })} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground hover:border-primary/50"><Plus className="h-4 w-4" /> Add FAQ</button>
            </Card>

            <Card title="Footer">
              <Area label="Tagline" value={content.footer.tagline} onChange={(v) => updateContent((d) => { d.footer.tagline = v; })} />
              <Field label="Contact email" value={content.footer.email ?? ""} onChange={(v) => updateContent((d) => { d.footer.email = v; })} />
              <Field label="Copyright line" value={content.footer.copyright} onChange={(v) => updateContent((d) => { d.footer.copyright = v; })} />
            </Card>
          </div>
  );
}
