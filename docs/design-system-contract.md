# Clipper Design System Contract (Hard Rules)

Source of truth:
- `/Users/leonardo/Downloads/stitch_clipper_ai_article_manager/clipper_premium_design_system/DESIGN.md`
- Screen-level HTML refs under `/Users/leonardo/Downloads/stitch_clipper_ai_article_manager/*/code.html`

This file is mandatory implementation contract for V2 UI.
No visual decision may override this contract without explicit approval.

## 1. Token Priority
1. DESIGN.md tokens (color/typography/spacing/radius) are first priority.
2. Screen-specific `code.html` values are second priority (for concrete component values).
3. Existing app style is third priority only when 1/2 do not define values.

## 2. Color Contract (must use exact values)
Core colors from DESIGN.md:
- `background/surface`: `#f9faf7`
- `on-background/on-surface`: `#1a1c1b`
- `on-surface-variant`: `#45474a`
- `surface-container`: `#edeeeb`
- `secondary`: `#45655b`
- `secondary-container`: `#c7eade`
- `on-secondary-container`: `#4b6b61`
- `outline`: `#76777b`
- `outline-variant`: `#c6c6ca`

Bottom nav from screen HTML contract:
- background: `bg-white/70` (or approved opaque replacement for RN if explicitly requested)
- top border: `border-black/5`
- active text/icon: emerald tone (`text-emerald-800`)
- inactive text/icon: zinc tone (`text-zinc-400`)

## 3. Typography Contract (must use exact scale)
From DESIGN.md:
- `h1-serif`: 32px, DM Serif Display
- `h2-serif`: 24px, DM Serif Display
- `body-reading`: 17px, Sora
- `body-chinese`: 17px, Noto Sans SC
- `metadata`: 13px, Sora
- `label-mono`: 12px, DM Mono, letter-spacing 0.05em

Bottom nav labels from screen HTML:
- `text-[10px] font-medium uppercase tracking-widest`

## 4. Router / Nav Contract
- Main app shell uses tabs architecture for Home + Library.
- Bottom nav is owned by tab layout, not duplicated inside pages.
- No extra top shortcuts (`Library`, `Storage`) unless present in design screen.

## 5. Detail Page Contract
- If design screen does not show tag editing controls, remove them.
- No `add tag`, `quick add`, or editable tag panel without explicit design artifact.

## 6. No-Inference Rule
- If a value is not explicit in DESIGN.md or code.html, stop and resolve by design review.
- Do not invent colors, radius, or spacing from personal preference.

## 7. PR / Commit Checklist
Before commit, verify:
1. Colors map to DESIGN.md tokens.
2. Font sizes map to DESIGN.md scale.
3. Screen structure matches corresponding `code.html`.
4. `pnpm check:all` passes.
5. Progress doc records design-alignment changes.
