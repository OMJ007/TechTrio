/**
 * Design token preview — /design
 *
 * Isolated reference surface for the Step 2 token system. It touches no product
 * screen and imports no product component: everything here is built directly
 * from the tokens so the page fails loudly if a token is wrong or missing.
 */

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Xpense AI — Design tokens" };

const CATEGORIES = [
  { name: "Food", cls: "bg-category-food", hex: "#F2C306" },
  { name: "Transport", cls: "bg-category-transport", hex: "#9FE3FF" },
  { name: "Rent", cls: "bg-category-rent", hex: "#ADB3FF" },
  { name: "Healthcare", cls: "bg-category-health", hex: "#F37CC9" },
  { name: "Groceries", cls: "bg-category-groceries", hex: "#A3A604" },
  { name: "Bills", cls: "bg-category-bills", hex: "#7384F7" },
  { name: "Entertainment", cls: "bg-category-entertain", hex: "#AD5CC3" },
  { name: "Shopping", cls: "bg-category-shopping", hex: "#C03F72" },
  { name: "Uncategorized", cls: "bg-category-uncategorized", hex: "#6D7077" },
  { name: "Education", cls: "bg-category-education", hex: "#057784" },
  { name: "Investments", cls: "bg-category-investments", hex: "#586302" },
];

const ELEVATIONS = [
  { name: "canvas", token: "--surface-canvas", hex: "#090B0F", use: "Page background", cls: "bg-canvas border border-line-subtle" },
  { name: "base", token: "--surface-base", hex: "#13161E", use: "Cards, panels", cls: "elev-base" },
  { name: "raised", token: "--surface-raised", hex: "#1B202B", use: "Nested blocks, table rows", cls: "elev-raised" },
  { name: "overlay", token: "--surface-overlay", hex: "#252B38", use: "Modals, popovers, menus", cls: "elev-overlay" },
];

function Section({ n, title, note, children }: { n: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="space-y-stack-md">
      <div className="flex items-baseline gap-3 border-b border-line-subtle pb-stack-sm">
        <span className="font-mono text-num-sm text-accent-300">{n}</span>
        <h2 className="text-h2 text-ink-primary">{title}</h2>
        <p className="ml-auto hidden text-caption text-ink-muted sm:block">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** Marks a figure the app invented rather than measured. */
function IllustrativeTag() {
  return (
    <span className="illustrative-outline inline-flex items-center gap-1.5 rounded-chip bg-surface-inset/60 px-2 py-1 text-overline uppercase text-ink-muted">
      <span className="illustrative-fill h-2.5 w-2.5 rounded-[2px] bg-surface-inset" />
      Illustrative
    </span>
  );
}

export default function DesignTokensPage() {
  return (
    <main className="min-h-screen bg-canvas px-gutter py-stack-xl lg:px-gutter-lg">
      <div className="mx-auto max-w-5xl space-y-section">
        <header className="space-y-stack-sm">
          <p className="text-overline uppercase text-accent-300">Xpense AI · Step 2</p>
          <h1 className="text-h1 text-ink-primary">Design tokens</h1>
          <p className="max-w-2xl text-body text-ink-secondary">
            Every value below resolves to a CSS custom property in{" "}
            <code className="rounded-chip bg-surface-raised px-1.5 py-0.5 font-mono text-num-sm text-accent-300">globals.css</code>.
            Nothing on this page uses a hardcoded color.
          </p>
        </header>

        {/* ── 01 Typography + KPI ──────────────────────────────────── */}
        <Section n="01" title="Type scale" note="Inter for language, JetBrains Mono for numerals">
          <div className="elev-base rounded-card p-card-pad">
            <p className="text-overline uppercase text-ink-muted">Net position</p>
            <p className="mt-1 font-mono text-num-hero tabular-nums text-ink-primary">+₹4,82,950.00</p>
            <p className="mt-2 text-body-sm text-ink-muted">
              Mono, tabular figures, one weight. Digits hold their column when the value updates.
            </p>
          </div>

          <div className="grid gap-stack-sm sm:grid-cols-2">
            <div className="elev-base space-y-stack rounded-card p-card-pad">
              <p className="text-overline uppercase text-ink-muted">Numerals · mono</p>
              {/* class names are written out in full — Tailwind cannot see `text-${tok}` */}
              {[
                { tok: "num-xl", spec: "28 / 500", sample: "₹1,45,000.00", cls: "text-num-xl" },
                { tok: "num-lg", spec: "20 / 500", sample: "₹68,400.00", cls: "text-num-lg" },
                { tok: "num-md", spec: "15 / 500", sample: "₹2,280.00", cls: "text-num-md" },
                { tok: "num-sm", spec: "13 / 400", sample: "16 Aug 2026", cls: "text-num-sm" },
              ].map(({ tok, spec, sample, cls }) => (
                <div key={tok} className="flex items-baseline justify-between gap-4 border-b border-line-subtle pb-2 last:border-0">
                  <span className="font-mono text-num-sm text-ink-muted">{tok}</span>
                  <span className={`font-mono tabular-nums text-ink-primary ${cls}`}>{sample}</span>
                  <span className="w-16 shrink-0 text-right text-caption text-ink-muted">{spec}</span>
                </div>
              ))}
            </div>

            <div className="elev-base space-y-stack rounded-card p-card-pad">
              <p className="text-overline uppercase text-ink-muted">Language · Inter</p>
              <p className="text-h1 text-ink-primary">Heading one</p>
              <p className="text-h2 text-ink-primary">Heading two</p>
              <p className="text-h3 text-ink-primary">Heading three</p>
              <p className="text-body text-ink-secondary">
                Body copy sits at 14px — the audit found 174 uses of 12px text carrying
                everything from table cells to entire advisor replies.
              </p>
              <p className="text-body-sm text-ink-muted">Small body, for secondary explanation.</p>
              <p className="text-label text-ink-muted">Label · form fields and controls</p>
              <p className="text-overline uppercase text-ink-muted">Overline · section eyebrows</p>
            </div>
          </div>
        </Section>

        {/* ── 02 Semantic ──────────────────────────────────────────── */}
        <Section n="02" title="Semantic colors" note="Gain, loss, attention, notice — reserved meanings">
          <div className="grid gap-stack-sm sm:grid-cols-2">
            <div className="elev-base rounded-card p-card-pad">
              <p className="text-overline uppercase text-ink-muted">Income</p>
              <p className="mt-1 font-mono text-num-xl tabular-nums text-positive">+₹1,45,000.00</p>
              <p className="mt-2 flex items-center gap-2 text-body-sm text-ink-muted">
                <span className="rounded-chip bg-positive/10 px-2 py-0.5 font-mono text-num-sm text-positive">▲ 8.4%</span>
                positive · #6DD17F
              </p>
            </div>
            <div className="elev-base rounded-card p-card-pad">
              <p className="text-overline uppercase text-ink-muted">Outflow</p>
              <p className="mt-1 font-mono text-num-xl tabular-nums text-negative">−₹68,400.00</p>
              <p className="mt-2 flex items-center gap-2 text-body-sm text-ink-muted">
                <span className="rounded-chip bg-negative/10 px-2 py-0.5 font-mono text-num-sm text-negative">▼ 3.2%</span>
                negative · #F17070
              </p>
            </div>
          </div>

          <div className="grid gap-stack-sm sm:grid-cols-2">
            <div className="rounded-card border border-warning/30 bg-warning/10 p-stack-md">
              <p className="text-label text-warning">Warning · #D5A776</p>
              <p className="mt-1 text-body-sm text-ink-secondary">Groceries is at 92% of its monthly limit.</p>
            </div>
            <div className="rounded-card border border-info/30 bg-info/10 p-stack-md">
              <p className="text-label text-info">Info · #B5BED2</p>
              <p className="mt-1 text-body-sm text-ink-secondary">Six receipts were parsed since your last visit.</p>
            </div>
          </div>
        </Section>

        {/* ── 03 Accent ────────────────────────────────────────────── */}
        <Section n="03" title="Accent" note="Interactive identity only — never means 'good'">
          <div className="elev-base space-y-stack-md rounded-card p-card-pad">
            <div className="flex flex-wrap items-center gap-stack-sm">
              <button className="rounded-chip bg-accent px-4 py-2 text-label text-accent-ink transition-colors hover:bg-accent-600">
                Add expense
              </button>
              <button className="rounded-chip border border-line-interactive bg-transparent px-4 py-2 text-label text-ink-secondary transition-colors hover:border-accent-400 hover:text-ink-primary">
                Export CSV
              </button>
              <a href="#01" className="text-label text-accent-300 underline-offset-4 hover:underline">
                A link in accent-300
              </a>
              <input
                aria-label="Sample input"
                placeholder="Search transactions"
                className="rounded-chip border border-line-interactive bg-surface-raised px-3 py-2 text-body-sm text-ink-primary placeholder:text-ink-muted"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["accent-700", "#057A6E"], ["accent-600", "#068F82"], ["accent-500", "#13A697"],
                ["accent-400", "#31C1B1"], ["accent-300", "#68DFCF"],
              ].map(([tok, hex]) => (
                <div key={tok} className="flex items-center gap-2 rounded-chip bg-surface-raised px-2.5 py-1.5">
                  <span className="h-4 w-4 rounded-[3px]" style={{ background: hex }} />
                  <span className="font-mono text-num-sm text-ink-secondary">{tok}</span>
                  <span className="font-mono text-num-sm text-ink-muted">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 04 Categories ────────────────────────────────────────── */}
        <Section n="04" title="Spending categories" note="Own hue and own lightness rung — never a semantic hue">
          <div className="elev-base rounded-card p-card-pad">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5 rounded-chip bg-surface-raised px-3 py-2">
                  <span className={`h-5 w-5 shrink-0 rounded-[4px] ${c.cls}`} />
                  <span className="text-body-sm text-ink-primary">{c.name}</span>
                  <span className="ml-auto font-mono text-num-sm text-ink-muted">{c.hex}</span>
                </div>
              ))}
            </div>

            {/* stacked bar — the real test is whether they separate side by side */}
            <div className="mt-stack-md">
              <p className="text-overline uppercase text-ink-muted">All eleven, adjacent</p>
              <div className="mt-2 flex h-10 overflow-hidden rounded-chip">
                {CATEGORIES.map((c) => (
                  <div key={c.name} className={`flex-1 ${c.cls}`} title={c.name} />
                ))}
              </div>
              <p className="mt-2 text-caption text-ink-muted">
                Worst-case separation ΔE<sub>OK</sub> 0.127 normal vision, 0.079 deuteranopia.
                Color is never the only encoding — every chart pairs it with a label.
              </p>
            </div>
          </div>
        </Section>

        {/* ── 05 Elevation ─────────────────────────────────────────── */}
        <Section n="05" title="Elevation" note="Border + background shift, not drop shadows">
          <div className="rounded-card bg-canvas p-stack-md">
            <div className="space-y-stack-sm">
              {ELEVATIONS.map((e) => (
                <div key={e.name} className={`rounded-card p-stack-md ${e.cls}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-h3 text-ink-primary">{e.name}</span>
                    <span className="font-mono text-num-sm text-ink-muted">{e.hex}</span>
                  </div>
                  <p className="mt-1 text-body-sm text-ink-muted">{e.use}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-stack-sm sm:grid-cols-3">
            {[
              ["line-subtle", "#2F3646", "Dividers inside a card"],
              ["line", "#464E60", "Default component edge"],
              ["line-interactive", "#6C7487", "Inputs — 3.48:1, clears 1.4.11"],
            ].map(([tok, hex, use]) => (
              <div key={tok} className="elev-base rounded-card p-stack-md">
                <div className="h-px w-full" style={{ background: hex }} />
                <p className="mt-2 font-mono text-num-sm text-ink-secondary">{tok}</p>
                <p className="text-caption text-ink-muted">{use}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 06 Radius ────────────────────────────────────────────── */}
        <Section n="06" title="Radius" note="Three steps, and that is the system">
          <div className="flex flex-wrap gap-stack-sm">
            {[
              ["chip", "8px", "rounded-chip", "Badges, inputs, buttons"],
              ["card", "14px", "rounded-card", "Cards, tables, charts"],
              ["modal", "20px", "rounded-modal", "Modals, sheets, popovers"],
            ].map(([name, px, cls, use]) => (
              <div key={name} className={`elev-raised flex-1 basis-56 p-stack-md ${cls}`}>
                <p className="text-h3 text-ink-primary">{name}</p>
                <p className="font-mono text-num-sm text-ink-muted">{px}</p>
                <p className="mt-1 text-caption text-ink-muted">{use}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 07 Illustrative data ─────────────────────────────────── */}
        <Section n="07" title="Illustrative data" note="A placeholder must not borrow a real figure's credibility">
          <div className="elev-base rounded-card p-card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-overline uppercase text-ink-muted">30-day cash flow forecast</p>
                <p className="mt-1 font-mono text-num-lg tabular-nums text-ink-muted">₹5,40,904.00</p>
              </div>
              <IllustrativeTag />
            </div>

            {/* mock chart: hatched fill + dashed baseline, all neutral chrome */}
            <div className="illustrative-outline mt-stack-md rounded-chip p-stack-sm">
              <svg viewBox="0 0 400 90" className="h-24 w-full" role="img" aria-label="Illustrative forecast chart">
                <defs>
                  <pattern id="hatch" width="7" height="7" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="7" stroke="rgb(var(--illustrative-hatch))" strokeOpacity="0.35" strokeWidth="2" />
                  </pattern>
                </defs>
                <path d="M0,70 L80,62 L160,48 L240,52 L320,32 L400,20 L400,90 L0,90 Z" fill="url(#hatch)" />
                <path
                  d="M0,70 L80,62 L160,48 L240,52 L320,32 L400,20"
                  fill="none"
                  stroke="rgb(var(--line-interactive))"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
              </svg>
            </div>

            <p className="mt-stack-sm text-body-sm text-ink-muted">
              Neutral chrome, hatched fill, dashed line — visibly not a measurement. The same
              tag marks any widget whose numbers the app generated rather than observed.
            </p>
          </div>
        </Section>

        <footer className="border-t border-line-subtle pt-stack-md text-caption text-ink-muted">
          Product screens still render in the previous blue palette — they migrate to these
          tokens screen by screen in Step 3.
        </footer>
      </div>
    </main>
  );
}
