# Integrating the YourStoriesLive design system

Reviewed: 17 November 2026 · Audience: application developers, designers and reviewers

Application main now includes the confirmed design-review corrections with **UI 1.4.7 / tokens 1.3.0**. The reviewed application code `7e315a3d` was promoted from `feature/design-system-review-fixes` on 17 November 2026. The package, unit, browser and bundle gates passed before promotion. A main push and its automatic deployment are separate from product/designer acceptance.

The [15 November comparison report](ui-library-verification.html) remains a dated capture of the earlier integration. Its screenshots and measurements have not been relabelled as evidence for this release. The [component catalogue](https://yourstorieslive-ui.vercel.app) and private [library source](https://github.com/pixeltrendanalytics-devs/yourstorieslive-ui) describe the reusable implementation.

## Version and distribution contract

| Item | Integration snapshot |
| --- | --- |
| React UI package | `@yourstorieslive/ui` **1.4.7** |
| Token package | `@yourstorieslive/tokens` **1.3.0** |
| Library source | `b2fbd0194e12c0635dac6a8319f110efc9cad28a` |
| Downloadable build | [Actions run 43899632784](https://github.com/pixeltrendanalytics-devs/yourstorieslive-ui/actions/runs/43899632784) |
| Application source | `7e315a3d9635b574bfacc1a24e131591ebdc0b47` (promoted to main; code snapshot) |
| Baseline | Application main `5e0a313`; historical pre-migration comparison remains dated 15 November |

The library is proprietary. Packages are **not published to npm**. Approved developers download archives from private GitHub Actions artifacts. Public guides and screenshots do not grant access to the library, and must never contain its archives, credentials or signed URLs.

## Download, verify and install

Use a GitHub account with read access to the private library. For the exact reviewed build:

```sh
gh run download 43899632784 \
  --repo pixeltrendanalytics-devs/yourstorieslive-ui \
  --name yourstorieslive-design-system \
  --dir vendor/yourstorieslive-ui

cd vendor/yourstorieslive-ui
shasum -a 256 -c SHA256SUMS
cd ../..

npm install ./vendor/yourstorieslive-ui/yourstorieslive-ui-1.4.7.tgz \
  ./vendor/yourstorieslive-ui/yourstorieslive-tokens-1.3.0.tgz
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

UI 1.4.7 / tokens 1.3.0 centralize the compatible 4px spacing scale and semantic layout/type roles. Shared card, control, navigation and media presentation now comes from the library. The later designer review supersedes the earlier violet: the approved light primary is `#50308F`; control height is 44px, base control radius 12px and card radius 16px.

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
npm run test:theme
npm run test:ui-ownership
npm run test:ui-budgets
npm run test:e2e:prelogin -- --workers=1
npm run build
npm run verify:ui-bundles
```

Ownership checks reject removed local UI patterns and unsafe library entrypoints. The production gate measures initial route JavaScript and emitted CSS against frozen budgets; do not increase a budget just to pass a migration. Optional menus, OTP, editor/media tools and notification renderers stay deferred where appropriate. Use public modular imports, not the compatibility root barrel.

The historical 15 November verification passed 432 suites / 5,276 unit tests and 36 pre-login browser tests. The promoted review code passed 5,277 tests across the same 432 suites with unchanged 90% coverage gates, plus all 38 pre-login browser tests, including the theme/mobile contracts. The initial design-review release passed 50 library unit tests and 18 browser contracts in both CSS delivery modes. The latest pinned 1.4.7 release also passes its upstream CI, including 18 browser contracts. Final-package application validation is recorded in its feature-branch report; these checks are not designer sign-off or authenticated transactional acceptance. Initial route bundles remain within their frozen limits. Total emitted JavaScript increased because deferred output also counts there; smaller initial bundles do not establish lower runtime latency. Production LCP/INP, slow-device behavior and representative network timings still need measurement.

Authenticated automated tests need controlled credentials and backend fixtures. The published comparison uses read-only authenticated browsing, not a new destructive or transactional end-to-end acceptance run.

## Rollout and review checklist

- [x] Private versioned packages, manifest and checksum validation integrated.
- [x] Provider/theme/fonts and framework adapters installed.
- [x] Basics, static/public/authenticated screens migrated and legacy showcase removed.
- [x] Dated first-integration desktop/mobile evidence retained without relabelling.
- [x] Confirmed review corrections released in the private library.
- [x] Promote the verified review branch to main.
- [ ] Complete product/designer acceptance and verify the resulting deployment.
- [ ] Designer approves spacing, typography, component states and latest Figma variable reconciliation.
- [ ] Product owner approves representative flows and known partial features.
- [ ] Controlled write/delete, cross-account permissions, provider login/import and large recording/upload acceptance completed.
- [ ] Production-like performance and supported real-device checks completed.
- [x] Merge the verified review code into main at the user's request.
- [ ] Verify deployment with the agreed rollback target retained.

Keep `release/pre-ui-library` and the baseline deployment available during review. Roll back application/package versions together; this presentation migration is not a database migration. Do not change the BFF or PHP mode merely to roll back styling.

## Related references

- [Visual verification and comparison](ui-library-verification.html)
- [Application architecture](application-architecture.md)
- [Features and member workflows](application-features.md)
- [Stakeholder migration FAQ](stakeholder-migration-faq.md)
- [API reference](api-reference.md)

## Confirmed review changes and open decisions

Confirmed changes include solid normal keyboard focus, semantic border fallback,
Link Button blue/underline states, 24px XS and 10px Small radius, consistent small
14/22 and mini 12/18 type, 30px CategoryBadge with an icon slot, expanded control
targets, and standalone heading aliases. Transparent content actions are owned
by the library rather than repeated local resets. The app retains form, partial
date, notification and media engine adapters and all API behavior.

Button padding/Large label size, Badge appearance mapping, soft fills, shadow
policy, icon/chip/tab sizes, category icons, tree geometry, loader specifications,
forced specimen states and error-focus policy still need design confirmation.
The existing editor palette remains serialized document data until its named colors have a confirmed mapping. Its literal values have a narrowly scoped guard exception. No public API or undecided token was removed. Fresh live Figma reads remain
quota-blocked; exact latest-variable/state parity is not certified.
