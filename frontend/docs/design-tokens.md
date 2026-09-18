# Xpense AI — design tokens

Single source of truth: `app/globals.css` declares the values, `tailwind.config.ts`
exposes them as utilities. **Components never hardcode a hex and never use an
arbitrary `[#...]` value.** Live reference: `/design`.

Colors are stored as space-separated sRGB channels (`19 166 151`) so Tailwind's
opacity modifiers work: `bg-accent/10`, `text-positive/70`.

## Three independent color systems

Nothing is shared between them. A category can never read as a profit or a loss,
and the accent never means "good".

### 1. Semantic — reserved meanings

| Token | Hex | Used for |
|---|---|---|
| `positive` | `#6DD17F` | Income, gains, under budget, on-track goals |
| `negative` | `#F17070` | Spend, losses, over budget |
| `warning` | `#D5A776` | Approaching a threshold, needs attention |
| `info` | `#B5BED2` | Neutral notices |

Warning is deliberately low-chroma. A vivid amber would collide with the category
ramp; semantic colors only ever appear on small badges and banners where chroma
isn't doing the work.

### 2. Accent — interactive identity

Teal, OKLCH hue 183.5. Buttons, links, focus rings, selection. Never a data value.

| Token | Hex | Used for |
|---|---|---|
| `accent-700` | `#057A6E` | Pressed |
| `accent-600` | `#068F82` | Hover on filled controls |
| `accent-500` | `#13A697` | **Default** — primary fills, brand |
| `accent-400` | `#31C1B1` | Icons, focus ring |
| `accent-300` | `#68DFCF` | Links and accent text on dark |
| `accent-ink` | `#04211C` | Label on an accent fill (5.59:1) |

### 3. Spending categories

Each category owns both its own hue **and** its own rung on a 10-step lightness
ladder. Lightness is the only channel that survives all three dichromacies, so the
ladder — not hue — is what keeps these apart for colorblind users.

| Category | Token | Hex | L |
|---|---|---|---|
| Transport | `category-transport` | `#9FE3FF` | .880 |
| Food | `category-food` | `#F2C306` | .835 |
| Rent | `category-rent` | `#ADB3FF` | .790 |
| Healthcare | `category-health` | `#F37CC9` | .745 |
| Groceries | `category-groceries` | `#A3A604` | .700 |
| Bills | `category-bills` | `#7384F7` | .655 |
| Entertainment | `category-entertain` | `#AD5CC3` | .610 |
| Shopping | `category-shopping` | `#C03F72` | .565 |
| Uncategorized | `category-uncategorized` | `#6D7077` | .545 |
| Education | `category-education` | `#057784` | .520 |
| Investments | `category-investments` | `#586302` | .475 |

Measured worst-case separation (ΔE in OKLab): **0.127** normal vision, **0.080**
deuteranopia, **0.079** protanopia, **0.097** tritanopia.

**Rule: color is never the only encoding.** Eleven categories cannot be made
reliably distinguishable by hue alone once red, green, amber and teal are reserved —
so every chart pairs its colors with a direct label or a legend in matching order.

The two darkest rungs (`education` #057784, `investments` #586302) sit at ~3:1 on
canvas. Fine as area or slice fills; if either is needed as a 1–2px stroke, use it
at a larger weight or add a label rather than lightening it ad hoc.

## UI chrome

One cool neutral ramp (OKLCH hue 266), so elevation never needs an ad-hoc opacity tweak.

| Token | Hex | Used for |
|---|---|---|
| `canvas` | `#090B0F` | Page background |
| `surface-base` | `#13161E` | Cards, panels |
| `surface-raised` | `#1B202B` | Nested blocks, table rows |
| `surface-overlay` | `#252B38` | Modals, popovers, menus |
| `surface-inset` | `#2F3646` | Wells, progress tracks |
| `line-subtle` | `#2F3646` | Dividers inside a card |
| `line` | `#464E60` | Default component edge |
| `line-interactive` | `#6C7487` | Inputs and focusable controls — 3.48:1 on raised, clears WCAG 1.4.11 |
| `ink-primary` | `#F1F4F9` | Headings, key figures |
| `ink-secondary` | `#BBC2CF` | Body copy |
| `ink-muted` | `#979EAF` | Labels, captions, metadata |

All three ink levels pass WCAG AA on every surface (worst case 5.28:1 on overlay).
This replaces the old `#5C6675` placeholder text at 3.05:1.

## Type

Inter for language, JetBrains Mono for numerals. Both self-hosted via `next/font`
(`app/fonts.ts`) — no network request, no layout shift. Mono is never used for
headings or prose.

| Token | Size / line-height / weight | Used for |
|---|---|---|
| `text-num-hero` | 40 / 1.0 / 500 | The one big balance on a screen |
| `text-num-xl` | 28 / 1.1 / 500 | KPI figures |
| `text-num-lg` | 20 / 1.2 / 500 | Card figures |
| `text-num-md` | 15 / 1.4 / 500 | Table amounts |
| `text-num-sm` | 13 / 1.4 / 400 | Tabular dates, metadata |
| `text-h1` | 26 / 1.2 / 600 | Page title |
| `text-h2` | 19 / 1.3 / 600 | Section heading |
| `text-h3` | 15 / 1.4 / 600 | Card heading |
| `text-body-lg` | 16 / 1.6 / 400 | Lead paragraph |
| `text-body` | 14 / 1.55 / 400 | **Default** body copy |
| `text-body-sm` | 13 / 1.5 / 400 | Secondary explanation |
| `text-label` | 12 / 1.35 / 500 | Form labels, controls |
| `text-caption` | 12 / 1.45 / 400 | Captions |
| `text-overline` | 11 / 1.2 / 600, +0.08em | Section eyebrows, uppercase |

Always pair mono numerals with `tabular-nums` so digits hold their column.

## Spacing

Strict 4px steps — Tailwind's numeric scale. Named aliases for recurring roles:

| Token | Value | Used for |
|---|---|---|
| `stack-xs` … `stack-xl` | 4 / 8 / 12 / 16 / 24 / 32 | Vertical rhythm inside a component |
| `card-pad` | 24 | Interior padding of every card |
| `gutter` / `gutter-lg` | 24 / 40 | Page gutter, mobile / desktop |
| `section` | 48 | Between major page sections |

`p-5`, `p-7`, `p-9` and `space-y-3.5` are off-scale and should resolve to the
nearest step during migration.

## Radius

Three steps. No per-component one-offs.

| Token | Value | Used for |
|---|---|---|
| `rounded-chip` | 8px | Badges, inputs, buttons, tags |
| `rounded-card` | 14px | Cards, tables, chart containers |
| `rounded-modal` | 20px | Modals, sheets, popovers |

## Elevation

Border + background shift, **not** drop shadows — shadows read as grey smudge on a
near-black canvas. Utility classes: `.elev-base`, `.elev-raised`, `.elev-overlay`.
Only `.elev-overlay` carries a shadow, to separate a floating layer from the page.

## Illustrative data

Marks a figure the app invented rather than measured, so a placeholder can't borrow
a real number's credibility.

- `.illustrative-fill` — diagonal hatch, neutral chrome, for chart areas
- `.illustrative-outline` — dashed container border
- Corner tag reading `Illustrative` in `text-overline` / `ink-muted`

Neutral by design: it must not read as a category or a semantic state. Currently
ships dark-only; the hatch is defined against chrome tokens so a light theme only
needs the token values swapped.

## Migration status

Product screens still render in the previous blue palette. They migrate screen by
screen in Step 3; the legacy `:root` block at the bottom of `globals.css` is deleted
as the last screen moves over.
