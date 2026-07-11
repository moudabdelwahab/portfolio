# Architecture

> This document describes what is **actually implemented** in this repository as of this
> revision. It was written by reading the source files directly — not from a plan or a
> prior summary — so it reflects real, verifiable behavior. Anything not yet built is
> listed explicitly under "Not Yet Implemented," not implied by omission.

---

## 1. Project Summary

A personal portfolio site with an in-browser WYSIWYG admin layer, for **Mahmoud
Abdelwahab**. Two HTML entry points share one rendering engine:

- `index.html` — public-facing portfolio. Fully wired: loads all CSS, mounts `#app`,
  and boots `src/js/app.js`, which loads data, renders every section, and applies the
  saved/default theme. No admin affordances are present.
- `admin.html` — the same shell plus `admin.css`, `body.is-admin-mode`, and mount
  points for the admin toolbar/modal/toast. Boots `src/js/admin-app.js`, which does
  everything `app.js` does, plus wraps rendered sections with editing overlays via
  `EditingController` and mounts `AdminToolbar` for undo/redo/import/export/reset.

Both entry points share the exact same `PortfolioRepository` and `Renderer` — there is
no admin-specific fork of either.

Content is Arabic, right-to-left (`meta.direction: "rtl"` in the data file). All CSS
already uses logical properties (`margin-inline`, `padding-block`, `inset-inline-start`,
etc.) specifically to support this without an LTR/RTL fork.

**Stack constraints (verified against actual code, not just stated):**
- No frameworks — confirmed, all files are plain ES modules and hand-written CSS.
- No backend — confirmed, persistence is `localStorage` only, data source is a static
  JSON file.
- ES Modules only — confirmed, every `.js` file uses `import`/`export`, no bundler
  config, no CommonJS.

---

## 2. Current File Tree

```
.
├── ARCHITECTURE.md
├── README.md
├── index.html                      # public entry — boots src/js/app.js
├── admin.html                      # admin entry — boots src/js/admin-app.js
├── data/
│   └── portfolio.default.json      # single source of truth for default content
├── assets/
│   └── sprite.svg                  # SVG <symbol> sprite, injected inline via ui/icon.js
└── src/
    ├── css/
    │   ├── tokens.css              # design tokens (colors, type, spacing, shadows, motion)
    │   ├── base.css                # reset, fonts, global utilities
    │   ├── layout.css              # navbar, mobile menu, theme toggle, footer
    │   ├── components.css          # buttons, chips, cards, timeline, modal, toast, forms
    │   ├── sections.css            # hero/about/experience/skills/projects/education/contact
    │   └── admin.css               # editing overlay, admin toolbar, drag states
    └── js/
        ├── app.js                  # public entry point
        ├── admin-app.js            # admin entry point
        ├── data/
        │   ├── StorageAdapter.js        # abstract adapter contract
        │   ├── LocalStorageAdapter.js   # localStorage implementation
        │   ├── JSONLoader.js            # generic fetch+cache JSON loader
        │   └── PortfolioRepository.js   # data access layer + validation + pub/sub
        ├── core/
        │   ├── EventBus.js          # generic app-wide pub/sub (independent of repo.subscribe)
        │   ├── HistoryManager.js    # in-memory undo/redo snapshot stack
        │   └── Renderer.js          # full mount + targeted per-sectionKey re-render
        ├── components/
        │   ├── renderUtils.js       # escapeHTML, safeHref, safeAssetPath
        │   ├── sectionRegistry.js   # sectionKey -> render fn + mount id(s)
        │   ├── Navbar.js, ThemeToggle.js, Hero.js, About.js, Experience.js,
        │   │   Skills.js, Projects.js, Education.js, Contact.js, Footer.js
        ├── ui/
        │   ├── icon.js              # sprite loader + <use>-based icon() helper
        │   ├── Modal.js             # openModal / closeModal / confirmModal
        │   ├── Toast.js             # showToast / toast.success|error|info
        │   ├── FormBuilder.js       # buildForm(schema, values) + readFormValues()
        │   └── DragDrop.js          # makeSortable() — native HTML5 drag reorder
        └── admin/
            ├── fieldSchemas.js      # pure data: editable fields per section/item type
            ├── EditingController.js # wraps rendered DOM with .editable/.editable-item,
            │                        # opens Modal+FormBuilder, calls repository.update()
            └── AdminToolbar.js     # undo/redo/export/import/reset, autosave + source badge
```

**No `i18n/` module exists.** It appeared in a later request's expected tree, but
nothing in the CSS or data layer implies a translation system — all content is
single-language Arabic, and `meta.language`/`meta.direction` are static data fields,
not a locale-switching mechanism. It was deliberately not built since there was
nothing in the existing implementation to ground it in. If multi-language support is
actually wanted, that's a new feature to scope explicitly, not an omission to silently
fill in.

**Filename normalization applied in this revision:** the uploaded project had
inconsistent casing (`Storageadapter.js`, `Jsonloader.js`, `Portfoliorepository.js`) and
one corrupted filename (`Localstorageadapter · JS`, apparently mangled during
export/zip — content was intact). All were renamed to match the class names they
export (`StorageAdapter.js`, `JSONLoader.js`, `PortfolioRepository.js`,
`LocalStorageAdapter.js`) with no changes to logic. The file `portfolio.default.json`
had a literal space in its name (`Portfolio.default .json`) and was corrected.

The `data/` and `assets/` directories were placed at the project root, and the JS data
layer under `src/js/data/`, because `PortfolioRepository.js` resolves the default JSON
via a relative path three levels up from its own location:

```js
const DEFAULT_JSON_URL = new URL('../../../data/portfolio.default.json', import.meta.url);
```

This only resolves correctly if the file sits at `src/js/data/PortfolioRepository.js`
relative to a `data/` folder at the repo root — so that is the layout this document
locks in. This was verified by resolving the URL directly (see §6).

---

## 3. Data Layer (implemented, verified)

### 3.1 Contract: `StorageAdapter`

Abstract base class with three async methods: `load(key)`, `save(key, value)`,
`clear(key)`. Each throws by default — any concrete adapter (localStorage today; an
API or Supabase adapter later) must implement all three with this exact signature so
`PortfolioRepository` never needs to change when the storage backend changes.

### 3.2 `LocalStorageAdapter`

Implements `StorageAdapter` over `window.localStorage`. Never throws outward — every
method wraps its logic in try/catch, logs a warning on failure (quota exceeded,
corrupt JSON, privacy-mode restrictions), and returns `null`/`false` instead of
propagating the error. This means storage failures degrade gracefully rather than
crashing the app.

### 3.3 `JSONLoader`

A generic `fetch`-based JSON loader, intentionally not coupled to portfolio data
specifically — it can load any JSON resource. Caches each URL's parsed result in an
in-memory `Map`; returns a `structuredClone()` of the cached value on repeat calls
unless `{ fresh: true }` is passed, so callers can never accidentally mutate the
shared cache.

### 3.4 `PortfolioRepository`

The central data-access layer. Holds the current data (`#data`), tracks where it came
from (`#source`: `'localStorage' | 'default' | 'none'`), and notifies subscribers on
change.

**Verified behaviors (see §6 for how):**

- **`load()`** — tries `localStorage` first; if present *and* it passes
  `validatePortfolioData`, uses it (`source = 'localStorage'`). Otherwise falls back to
  `data/portfolio.default.json` (`source = 'default'`). Never writes to storage during
  load — only explicit mutations persist.
- **`update(sectionKey, newValue)`** — replaces exactly one section, re-validates the
  *entire* resulting object (not just the changed section, so cross-section
  consistency issues would still be caught), persists, and notifies subscribers with
  `{ sectionKey, data }` — `sectionKey` is the changed key, so a renderer can re-draw
  only that section instead of the whole page.
- **`replaceAll(newData)`** — validates and swaps the whole document at once (used for
  import, undo/redo snapshots), notifies with `sectionKey: null` as a signal to
  re-render everything.
- **`reset()`** — clears the stored key and reloads the default JSON, notifies with
  `sectionKey: null`.
- **`exportJSON()` / `importJSON(input)`** — round-trip the whole document as a
  formatted JSON string; `importJSON` accepts either a string or a pre-parsed object
  and validates before committing.
- **`subscribe(listener)`** — returns an unsubscribe function; supports multiple
  concurrent listeners via a `Set`.
- **`getAll()` / `getSection(key)`** — both return `structuredClone()`s, so callers can
  never mutate internal state directly and bypass validation/persistence.

### 3.5 `validatePortfolioData(data)`

A deliberately shallow structural check, not a full schema validator. For each of the
eight required top-level sections (`meta`, `profile`, `about`, `experience`, `skills`,
`projects`, `education`, `contact`), it confirms the section is a plain object and, if
that section is expected to contain a list (e.g. `experience.items`,
`skills.categories`), that the list field is an array. This is intentionally just
enough to stop malformed data from breaking the renderer — not full per-field
validation. Returns `{ valid: boolean, errors: string[] }`.

### 3.6 Storage key & versioning

`STORAGE_KEY = 'mad3oom:portfolio:data:v1'`. The `:v1` suffix is a deliberate
versioning hook — if the data shape changes later in a breaking way, the key can be
bumped to `:v2` so old, incompatible localStorage payloads are naturally ignored
instead of failing validation in a confusing way.

---

## 4. Data Shape (`data/portfolio.default.json`)

Top-level keys, each matching a section in `REQUIRED_SECTIONS`:

| Section      | Required list field | Notes |
|---|---|---|
| `meta`       | `navigation`         | site name, tagline, language/direction, SEO description, nav links |
| `profile`    | *(none)*              | name, title, bio, avatar, CTAs, highlight chips |
| `about`      | `paragraphs`          | eyebrow/heading + paragraph list + focus-area chips |
| `experience` | `items`               | role, company, period, summary, tags |
| `skills`     | `categories`          | each category has its own `items` list |
| `projects`   | `items`               | see below — this is where `Mad3oom` lives |
| `education`  | `items`               | institute, degree, period, grade |
| `contact`    | *(none)*              | email, phone, location, linkedin, github |

The one project currently in the data is **Mad3oom**, a SaaS support platform, with a
four-phase `timeline` (Foundations → External Integration → MCP Support → Support
Intelligence Engine), a `currentFocus` list, and an `achievements` list. The CSS in
`sections.css` (`.project-phases`, `.phase-step`, etc.) is built specifically around
this four-phase shape.

---

## 5. CSS Architecture (implemented, verified)

Six files, loaded in this cascade order (tokens → base → layout → components →
sections → admin so later files can rely on tokens/utilities from earlier ones):

1. **`tokens.css`** — the only place colors, type scale, spacing scale, radii,
   shadows, motion curves, and z-index layers are defined. Includes a full
   `[data-theme="light"]` override block, so theme switching is a single attribute
   toggle on a root element, not a class-based override scattered across files.
2. **`base.css`** — reset, Google Fonts import (Cairo / IBM Plex Sans Arabic / Space
   Grotesk), `prefers-reduced-motion` handling, and general-purpose utility classes
   (`.container`, `.eyebrow`, `.glass`, `.gradient-text`, `.sr-only`). Also defines
   `.reveal` / `.reveal.in`, a scroll-in animation class whose *trigger* (an
   `IntersectionObserver`) is JS that does not exist yet — see §7.
3. **`layout.css`** — page chrome: `#scroll-progress` bar, `.navbar` (with
   scroll-state, mobile hamburger, `.mobile-menu`), `.theme-toggle`, and `footer`.
4. **`components.css`** — reusable UI: buttons, chips, cards, badges, avatar, a
   generic `.timeline` (shared by Experience and the Mad3oom project timeline), a
   `.check-list` for achievements, form field styling, `.modal-*` (for `ui/Modal.js`),
   `.toast-*` (for `ui/Toast.js`), and `.drag-handle` / `.drop-indicator` (for
   `ui/DragDrop.js`). These comments in the CSS are the clearest evidence of the
   intended Stage 4 file names.
5. **`sections.css`** — per-section visual treatment for Hero (avatar + orbiting skill
   chips + animated rings + circuit background — a deliberate departure from the
   reference design's robot graphic), About, Experience, Skills, Projects (including
   the Mad3oom four-phase step grid), Education, Contact.
6. **`admin.css`** — scoped entirely to admin mode (`body.is-admin-mode`): `.editable`
   hover outline + floating `.edit-btn`, per-item `.item-toolbar` for reorderable
   lists, `.add-item-btn`, sortable/drag states, and a fixed `.admin-toolbar` with an
   autosave indicator and a `.source-badge` — the latter is clearly meant to display
   `PortfolioRepository.getSource()` directly in the UI.

Design tokens and theme handling apply to public and admin views alike; `admin.css`
adds only editing chrome and never redefines a token.

---

## 6. What Has Been Verified, and How

Rather than repeat the claim "tested fully with Node.js" unverified, here is exactly
what was checked in this revision and the result:

Ran `PortfolioRepository` end-to-end in Node with an in-memory `StorageAdapter`
implementation (Node has no `window.localStorage`, so `LocalStorageAdapter` itself
can't run outside a browser — this is expected and not a bug):

- ✅ Section `update()` mutates only the target section, persists, and notifies
  subscribers with the correct `sectionKey`.
- ✅ Invalid updates (e.g. `skills.categories` set to a non-array) are rejected with a
  clear validation error and the in-memory state is left unchanged.
- ✅ `exportJSON()` produces valid, parseable JSON.
- ✅ `validatePortfolioData()` correctly flags an incomplete object across all
  8 required sections.
- ⚠️ `load()` and `reset()`'s fallback to `data/portfolio.default.json` **could not be
  exercised through `JSONLoader` in plain Node**, because Node's built-in `fetch()`
  does not support `file://` URLs. This is a Node testing-environment limitation, not
  an application bug: fetched directly over real HTTP (`python3 -m http.server`),
  `data/portfolio.default.json` serves and parses correctly, and
  `validatePortfolioData()` passes on it. In a browser or any local dev server, the
  `fetch()` call in `JSONLoader` will work normally. Worth knowing if unit tests are
  added later: they'll need either a `file://`-aware fetch polyfill or to run against
  a local server, not raw `node script.mjs`.
- The path resolution itself (`../../../data/portfolio.default.json` from
  `src/js/data/PortfolioRepository.js`) was independently verified to resolve to the
  correct absolute path.
- ✅ (fixed in a later revision) `update()` originally left `#source` at its old value
  instead of setting it to `'localStorage'` like `replaceAll()` correctly does —
  caught via the integration testing described in §7.7, fixed as a one-line change.

This covers the data layer in isolation. §7.7 covers full-stack verification —
rendering, the editing UI, and the admin toolbar — added once that code existed.

---

## 7. Rendering Architecture (implemented, verified)

### 7.1 Renderer

`core/Renderer.js` has two entry points:
- `mount(data)` — full render. Injects the sprite inline (once, via `ui/icon.js`),
  then builds `#app`'s entire structure: one `<div id="X-mount">` wrapper per section,
  in a fixed order. Called once at startup, and again for any full-data replacement
  (import, reset, undo/redo).
- `update({ sectionKey, data })` — targeted render. Looks up `sectionKey` in
  `components/sectionRegistry.js`, calls that section's render function only, and
  replaces just its mount `innerHTML`. `sectionKey: null` triggers a full `mount()`
  instead — this is the exact contract `PortfolioRepository.#notify()` was already
  documented to emit in §3.4, and it's honored end-to-end now.

### 7.2 sectionRegistry

Maps each `PortfolioRepository` `sectionKey` to its render function and target mount
id(s). `meta` is the one special case — it has no single mount of its own, since its
data feeds both `Navbar` and `Footer`, so its registry entry updates two mounts at
once.

### 7.3 Components

Nine pure render functions (`components/*.js`), each `(data) => htmlString`. None of
them know whether they're running in `index.html` or `admin.html` — admin-only
behavior (edit overlays) is layered on afterward by `EditingController`, never inside
the components themselves. All user-supplied text is passed through
`renderUtils.escapeHTML`; all external links through `safeHref` (only allows
`http(s):`, `mailto:`, `tel:`, `#`); local asset paths (e.g. the avatar image) through
the separate `safeAssetPath` (allows relative paths, rejects `javascript:`). These are
deliberately different functions — reusing `safeHref` for an `<img src>` was an actual
bug caught during verification (§7.6) because it silently turned real relative image
paths into `"#"`.

### 7.4 Editing Layer

`admin/EditingController.js` runs once after every render (full or targeted) and:
- Wraps each section's heading area in `.editable` + a floating `.edit-btn` (opens a
  `Modal` with a `FormBuilder` form for that section's "singular" fields, per
  `admin/fieldSchemas.js`).
- Wraps each list item (experience/projects/education entries, skill chips) in
  `.editable-item` + `.item-toolbar` (drag handle, edit, duplicate where applicable,
  delete).
- Adds an `.add-item-btn` at the end of each list.
- Calls `ui/DragDrop.js`'s `makeSortable()` on each list container for drag-reorder.

Every mutation funnels through one private method, `#commitSectionUpdate`, which calls
`PortfolioRepository.update()`, then `HistoryManager.push()`, then a `toast.success`
or `toast.error` depending on outcome. `skills` has its own parallel set of handlers
(`enhanceSkills`, `#openSkillItemForm`, etc.) because its shape is a category
containing a nested item list — not a flat list like the others — but it still funnels
through the same `#commitSectionUpdate`.

### 7.5 AdminToolbar

Fixed bar (`admin/AdminToolbar.js`), mounted once into `#admin-toolbar-root`: undo/redo
(driven by `HistoryManager`), export (downloads `exportJSON()` as a file), import (file
picker → `importJSON()`), reset (confirms, then `repository.reset()`), an autosave
indicator, and a source badge reflecting `repository.getSource()`.

### 7.6 Bugs found and fixed during integration verification

Real browser behavior was verified using jsdom (see below) rather than assumed. Three
genuine bugs were caught and fixed this way, not left for a future pass:

1. **`safeHref` misused for image `src`** (Hero avatar) — `safeHref`'s allow-list
   (`http(s):`/`mailto:`/`tel:`/`#`) doesn't include relative paths, so
   `profile.avatar` (`"assets/images/avatar-placeholder.svg"`) was silently rewritten
   to `"#"`. Fixed by adding a separate `safeAssetPath()` with the correct allow-list
   for local asset references, and using it in `Hero.js`.
2. **`.editable` on a `position:fixed` element** — `EditingController.enhanceSection`
   originally wrapped `#site-navbar` itself (via a generic `mount.firstElementChild`
   fallback) for the `meta` section. `.navbar` is `position:fixed`; `.editable` sets
   `position:relative`, and since `admin.css` loads after `layout.css`, it would have
   won the cascade and broken the fixed navbar. Fixed by giving the inner `.brand`
   link an id (`#navbar-brand`, itself not `position:fixed`) and having
   `enhanceSection('meta')` target that specifically instead of relying on the generic
   fallback.
3. **Undo/redo buttons showed stale state right after an edit** — `AdminToolbar`'s
   `disabled` state for undo/redo is set by `refresh()`, which was being triggered
   from `PortfolioRepository.subscribe()` — but that notification fires synchronously
   *inside* `repository.update()`, before `EditingController` got to the next line
   where it called `history.push()`. So the very first `refresh()` after an edit always
   read history state from *before* that edit. Fixed by decoupling: `EditingController`
   now takes an `onHistoryChange` callback (wired to `toolbar.refresh()` in
   `admin-app.js`) and calls it itself, immediately after `history.push()`, instead of
   relying on the repository's own notification timing for this.

Also fixed in this pass, found by re-reading rather than testing: `PortfolioRepository
.update()` never set `this.#source = 'localStorage'` (unlike `replaceAll()`, which
correctly does), so the toolbar's source badge would keep showing "default" after a
normal single-section edit. One-line fix in `PortfolioRepository.js`.

### 7.7 How this was verified

No headless browser could be installed in this environment (network egress is
restricted to package registries — see `<network_configuration>`; `playwright install`
was attempted and blocked). Verification instead used:

- **Static HTML correctness**: every component's render output was executed in Node
  against the real `data/portfolio.default.json` and parsed with a real HTML parser
  (BeautifulSoup), confirming every mount point, every project phase, every skill
  category/chip count, and every achievement matched the source data exactly.
- **Full DOM integration tests via `jsdom`**: `admin-app.js`'s actual wiring (repo +
  renderer + history + editing controller + toolbar, constructed exactly as
  `admin-app.js` does it) was run in a simulated browser DOM, with real `click` events
  dispatched at real buttons rendered by real component code — not mocked. Verified,
  end-to-end, with real data flowing through: section edit + save, item add, item
  delete + confirm, item edit (including the nested skills category/item case), undo,
  redo, reset, and the reorder-splice contract each `DragDrop` reorder resolves to.
  The public `app.js` path was separately verified: correct theme application, zero
  `.editable`/`.edit-btn` elements present (confirming admin behavior doesn't leak into
  the public build), and working theme-toggle/mobile-menu interactions.
- Native HTML5 drag-and-drop mouse events are not reliably simulatable in `jsdom`; that
  gap is stated plainly here rather than glossed over. What was verified instead:
  `makeSortable()` attaches and tears down without error on real rendered list
  markup, and the underlying reorder data operation (list splice from one index to
  another, called via `PortfolioRepository.update()`) produces the correct result.
  Manual testing of the actual drag gesture in a real browser is the one remaining
  verification step neither this environment nor the automated tests can cover.

## 8. Not Yet Implemented

- **Final QA**: accessibility pass, responsive/breakpoint check in a real viewport,
  performance/Lighthouse audit, general cleanup.
- **Manual drag-and-drop verification** in an actual browser (§7.7).
- **`assets/images/avatar-placeholder.svg`** referenced by `profile.avatar` in the
  default data does not exist as a file. This is handled gracefully at render time
  (`Hero.js` uses `onerror="this.remove()"`, falling back to initials), so it is not a
  broken build — but the placeholder image itself was never created.
- **`core/EventBus.js`** exists and is unit-sound but is not currently wired into any
  consumer — nothing in the built components/admin layer needed cross-cutting events
  yet. Left in place per the original roadmap for when a future feature needs it
  (e.g., decoupling toast triggers from direct imports).
- **IntersectionObserver trigger** for the existing `.reveal` / `.reveal.in` CSS
  classes in `base.css` — still not wired to anything. No component currently applies
  `.reveal` to its markup either, so right now these classes have no effect at all.
  Likely belongs in `app.js`/`admin-app.js` or a small `scrollReveal.js` utility,
  applied after each render.

---

## 9. Rules for Continuing Work

- Do not redesign the data layer, CSS architecture, folder structure, rendering
  pipeline, or editing layer documented above — they are implemented and verified
  working (§7.7).
- Any new adapter (API, Supabase, etc.) must extend `StorageAdapter` with the same
  three-method signature; `PortfolioRepository` should not need to change.
- All content stays in `data/portfolio.default.json`. No hardcoded copy in HTML or JS
  (the `<title>`/meta-description fallback in `index.html`'s `<head>` remains the one
  documented, deliberate exception — see §2).
- New CSS follows the existing cascade order and reuses tokens from `tokens.css`
  rather than introducing new hardcoded values.
- Renderer work must continue to honor the `sectionKey` contract emitted by
  `PortfolioRepository` — targeted re-render when a key is given, full re-render on
  `null`. Any new section added to the data model needs a matching entry in
  `sectionRegistry.js`.
- New editable fields go in `admin/fieldSchemas.js`, not hardcoded into
  `EditingController.js` — keep the schema/logic separation.
- Text rendered from data must go through `escapeHTML`; navigable links through
  `safeHref`; local asset paths through `safeAssetPath`. Do not reuse `safeHref` for
  non-navigable contexts like `<img src>` (§7.6, bug 1) — the two exist because their
  allow-lists are legitimately different.
- Do not wrap `position:fixed` elements directly in `.editable` (§7.6, bug 2) — target
  a non-fixed inner element instead.
- Any new mutation path in `EditingController` must call `history.push()` and then
  `onHistoryChange()` itself, in that order, rather than relying on
  `PortfolioRepository.subscribe()` timing to refresh undo/redo state (§7.6, bug 3).
