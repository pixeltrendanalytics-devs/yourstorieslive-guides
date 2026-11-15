# Integrating the YourStoriesLive design system

Reviewed: 15 November 2026 · Audience: application developers, designers and reviewers

The application now consumes the private YSL library rather than maintaining a second visual component system. This guide describes the integration on **`feature/ysl-ui-library-integration` at `62a7e286`**. It does not mean this branch has been merged into application main or deployed over the existing Vercel application.

Start with the [side-by-side verification report](ui-library-verification.html) for current screenshots, checks and acceptance limits. The [component catalogue](https://yourstorieslive-ui.vercel.app) documents reusable components. The private source is [yourstorieslive-ui](https://github.com/pixeltrendanalytics-devs/yourstorieslive-ui).

## Version and distribution contract

| Item | Integration snapshot |
| --- | --- |
| React UI package | `@yourstorieslive/ui` **1.3.1** |
| Token package | `@yourstorieslive/tokens` **1.2.0** |
| Library source | `9401d273f35ce6d5e2138b1dc1d06cb167c08008` |
| Downloadable build | [Actions run 43669008401](https://github.com/pixeltrendanalytics-devs/yourstorieslive-ui/actions/runs/43669008401) |
| Application source | `62a7e2868470e96d9b0be6c252ed118ff0cd1e1d` |
| Baseline | Existing pre-migration Vercel deployment, captured 15 November; deployed commit not independently established |

The library is proprietary. Packages are **not published to npm**. Approved developers download archives from private GitHub Actions artifacts. Public guides and screenshots do not grant access to the library, and must never contain its archives, credentials or signed URLs.

## Download, verify and install

Use a GitHub account with read access to the private library. For the exact reviewed build:

```sh
gh run download 43669008401 \
  --repo pixeltrendanalytics-devs/yourstorieslive-ui \
  --name yourstorieslive-design-system \
  --dir vendor/yourstorieslive-ui

cd vendor/yourstorieslive-ui
shasum -a 256 -c SHA256SUMS
cd ../..

npm install ./vendor/yourstorieslive-ui/yourstorieslive-ui-1.3.1.tgz \
  ./vendor/yourstorieslive-ui/yourstorieslive-tokens-1.2.0.tgz
```

Use `sha256sum -c SHA256SUMS` on Linux. Confirm `manifest.json` names the expected source commit and versions. Review newer releases deliberately; do not silently replace an approved archive with whichever build happens to be latest.

Retain the exact archives, manifest, checksums and lockfile in the consuming **private** repository or approved private artifact storage. Actions artifacts expire after 90 days. The files referenced by `file:` dependencies must be available before `npm ci`. In YSL, `npm run verify:ui-artifacts` verifies the retained distribution.

## Theme, fonts and server rendering

The library owns semantic colors, spacing, typography, radii, elevations, component sizing and reusable patterns. It follows shadcn conventions with Radix interaction primitives and Tailwind CSS. Tailwind and shadcn are complementary here.

The Next.js host loads Inter body text, Literata SemiBold headings and the supported locale fallback fonts through `next/font`. It supplies font variables; the library supplies type roles. Use public modular imports to preserve server-renderable primitives and avoid loading an entire client-only component barrel.

The Tailwind 4 host loads one theme and explicitly scans application/package output:

```css
@import 'tailwindcss' source(none);
@source '../src';
@source './';
@import '@yourstorieslive/ui/theme.css';
@source '../node_modules/@yourstorieslive/ui/dist';
```

Paths above are relative to `app/globals.css`. Explicit sources prevent examples, reports and documentation from inflating production CSS. Applications that do not compile Tailwind use `@yourstorieslive/ui/styles.css` instead. Never load both compiled utility CSS and the Tailwind theme entry.

`getDesignSystemRootAttributes` from `@yourstorieslive/ui/design-system-root` sets initial HTML brand, direction, locale and theme. YSL resolves the theme cookie on the server and passes the same initial theme into its client provider. This avoids a different theme on initial HTML and hydration.

The application adapter composes:

```tsx
<DesignSystemProvider
  brand="ysl"
  locale={locale}
  direction={siteConfig.direction}
  defaultTheme={initialTheme}
  onThemeChange={saveThemePreference}
  enableSystem={false}
  storageKey={false}
  notifications={false}
>
  {children}
</DesignSystemProvider>
```

`locale`, `initialTheme` and `saveThemePreference` are application values, not library globals. YSL explicitly chooses light/dark using a cookie and header toggle. It disables system/local-storage selection and uses its existing translated notification adapter to avoid duplicate toasters. Other applications may opt into system theme and the library toaster.

This integration does **not** make Next.js a static export. Request locale/theme resolution and the runtime image optimizer remain server responsibilities.

## Components and framework adapters

Use supported exports, for example:

```tsx
import { Button } from '@yourstorieslive/ui/button';
import { Card, CardContent, CardHeader } from '@yourstorieslive/ui/card';
import { PhotoTile } from '@yourstorieslive/ui/photo-tile';
```

Keep navigation and image optimization in the application:

```tsx
<Button asChild>
  <Link href="/yourtimeline">{messages.openTimeline}</Link>
</Button>

<PhotoTile
  media={<Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 50vw, 25vw" />}
  selectionLabel={messages.selectPhoto(photo.name)}
/>
```

The snippets assume host imports for Next Link/Image and host-owned translated labels/data. `asChild` supplies presentation to the actual link without creating nested interactive elements. Media slots retain Next Image dimensions, responsive sizes and lazy loading. Do not replace optimized images with raw full-size originals just to match a library demo.

Do not import package `dist` internals, Storybook stories, or library source. The CSS scan of package distribution is build configuration, not permission to import private runtime internals.

## What belongs where

| Library owns | Application owns |
| --- | --- |
| Semantic colors, spacing/type roles, control heights, radii and shadows | Routing, SEO, locale messages and analytics |
| Buttons, fields, cards, dialogs, popovers, menus, alerts and empty states | Form bindings, schema validation, API errors and domain state |
| Navigation, timeline, photo, upload and bulk-action presentation | Permissions, sharing decisions, request ordering and Redux |
| Accessible interaction and reusable pattern slots | Next Image/Link adapters, upload/recording/transcription and partial-date semantics |

The local kitchen-sink route and its twelve source files were removed. The permanent catalogue is library Storybook. Nine presentation-only local wrappers and two UI-only menu hooks were removed in the cleanup. Retained application components are domain/framework adapters, not a competing visual library.

Documented exceptions include rich text, recording/video behavior, partial dates, virtualized geometry, ancestry connectors, sticky toolbars and safe-area positioning. They should consume shared tokens and remain narrowly scoped. If Figma/library already has the visual component, extend that component rather than introducing another local style system.

## Spacing and Figma verification

UI 1.3.1 / tokens 1.2.0 centralize the compatible 4px spacing scale and semantic layout/type roles. Shared card, control, navigation and media presentation now comes from the library. The approved light primary is `#572EA6`; control height is 44px, base control radius 12px and card radius 16px.

**Latest named Figma variable parity is still pending.** The recorded 14 November Figma inventory lists 28 spacing variables. A fresh variable read reached the Figma MCP Starter-plan quota. The compatible spacing implementation and source cleanup are verified; exact reconciliation against the latest named Figma variables is not certified. Designer review must close that item rather than infer parity from similar screenshots.

## Development and upgrade workflow

1. Identify the existing interaction contract, translated labels and data states.
2. Reuse a library component. If a reusable capability is missing, implement and test it in library main first.
3. Produce a versioned private Actions build, verify its manifest/checksums, then update the application archives and lockfile.
4. Preserve API calls, validation, image sizing, lazy loading, pagination and request counts.
5. Remove replaced local presentation in the same change. Record necessary domain exceptions.
6. Run targeted checks during development and the complete acceptance gate before delivery. Update the application implementation plan and migration-method document.
7. Capture matching desktop/mobile data and review with the designer/product owner before application rollout.

## Checks and performance gates

Run in the application checkout:

```sh
npm ci
npm run verify:ui-artifacts
npm run typecheck
npm run lint
npm run test -- --maxWorkers=2 --workerIdleMemoryLimit=512MB
npm run test:ui-ownership
npm run test:ui-budgets
npm run test:e2e:prelogin -- --workers=2
npm run build
npm run verify:ui-bundles
```

Ownership checks reject removed local UI patterns and unsafe library entrypoints. The production gate measures initial route JavaScript and emitted CSS against frozen budgets; do not increase a budget just to pass a migration. Optional menus, OTP, editor/media tools and notification renderers stay deferred where appropriate. Use public modular imports, not the compatibility root barrel.

The 15 November verification passed 432 suites / 5,276 unit tests and 36 pre-login browser tests. Initial route bundles remain within their frozen limits. Total emitted JavaScript increased because deferred output also counts there; smaller initial bundles do not establish lower runtime latency. Production LCP/INP, slow-device behavior and representative network timings still need measurement.

Authenticated automated tests need controlled credentials and backend fixtures. The published comparison uses read-only authenticated browsing, not a new destructive or transactional end-to-end acceptance run.

## Rollout and review checklist

- [x] Private versioned packages, manifest and checksum validation integrated.
- [x] Provider/theme/fonts and framework adapters installed.
- [x] Basics, static/public/authenticated screens migrated and legacy showcase removed.
- [x] Fresh desktop/mobile evidence and automated checks recorded in the comparison report.
- [ ] Designer approves spacing, typography, component states and latest Figma variable reconciliation.
- [ ] Product owner approves representative flows and known partial features.
- [ ] Controlled write/delete, cross-account permissions, provider login/import and large recording/upload acceptance completed.
- [ ] Production-like performance and supported real-device checks completed.
- [ ] Merge/deploy the approved application feature branch with an agreed rollback target.

Keep `release/pre-ui-library` and the baseline deployment available during review. Roll back application/package versions together; this presentation migration is not a database migration. Do not change the BFF or PHP mode merely to roll back styling.

## Related references

- [Visual verification and comparison](ui-library-verification.html)
- [Application architecture](application-architecture.md)
- [Features and member workflows](application-features.md)
- [Stakeholder migration FAQ](stakeholder-migration-faq.md)
- [API reference](api-reference.md)
