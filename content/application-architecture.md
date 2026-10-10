# Application architecture: Next.js, NestJS BFF and PHP

Reviewed: 10 October 2026 · Audience: stakeholders, product owners and developers

YourStoriesLive is modernizing its web experience in stages. Next.js owns the user interface; a NestJS backend for frontend (BFF) gives it a consistent application API; the existing PHP services continue to serve most established business operations. Completing the UI migration and replacing the PHP backend are separate milestones.

This guide describes the inspected main-branch code. The AWS-owned media implementation is a separate POC branch and is covered in the [AWS POC record](yourstorieslive-aws-media-poc-record.html). Hosting diagrams in that record do not establish the current production deployment.

## At a glance

```text
Member's browser
  ├─ Next.js interface: pages, forms, navigation, media controls
  │    └─ Typed application API client
  │         └─ NestJS BFF: authentication, validation, orchestration
  │              └─ PHP compatibility adapters
  │                   └─ Existing PHP APIs and their data/media services
  │
  ├─ Images: Next.js image optimizer → permitted media origin
  └─ Selected external integrations: maps/places and runtime translation
```

The application API client targets the BFF. Media display and explicitly configured external services have their own delivery paths; it would be inaccurate to say every network request in the browser passes through NestJS.

| Layer | Its responsibility | Why stakeholders should care |
| --- | --- | --- |
| Browser | Interactions, local recording, file selection, accessible controls and client-side state | Members get feedback before they wait for an API call. |
| Next.js application | Page/layout composition, public-site metadata, localization and the runtime image endpoint | A consistent experience across public pages, signed-in areas and mobile screens. |
| NestJS BFF | Versioned REST routes, request validation, session handling, response mapping and upstream calls | PHP-specific contracts have one integration boundary rather than being repeated in each screen. |
| Existing PHP services | Established account, story, contact, profile and media operations in compatibility mode | Existing business behavior can continue while the UI changes. |
| Media origin | Original image, audio and video bytes | File storage and optimized display versions have different purposes. |

## How the Next.js frontend is organized

The inspected frontend uses Next.js 16, React 19 and TypeScript. App Router groups organize public, authentication, authenticated-member and collaboration pages. A shared application shell provides navigation, locale controls and account actions; feature folders contain each area's screens and interaction logic.

Shared UI components and design tokens make forms, dialogs, cards, loaders and empty states consistent. The kitchen-sink page is a development reference for those components. Redux manages client-side application state, React Hook Form and Zod support forms, and typed API service functions keep request details separate from rendering code.

The site has nine UI locale catalogs: English, Hindi, Tamil, Korean, Chinese, French, Spanish, German and Japanese. Editorial and member-written content have separate translation coverage; a translated navigation bar does not establish that every article or member story has been translated.

The frontend is configured with `output: 'standalone'`. It runs a Node.js server and retains Next.js runtime features, including image optimization. Public pages and assets can still be cached where appropriate. The standalone application is a different deployment from this static GitHub Pages documentation library.

## How the NestJS BFF is organized

The BFF uses NestJS 11 and TypeScript. Its application modules cover identity, profile, contacts, directory, ancestry, stories/entities, contributions, media, life-story answers, reflections, notifications, access links, support and legacy-planning operations. Social photo import has its own provider-handshake module. Having a module or a database design does not mean every future implementation is complete.

A normal operation follows this sequence:

```text
REST controller and request DTO
             ↓
Authentication/context + validation
             ↓
Domain service facade and operation contract
             ↓
Selected implementation: PHP adapter or new service
             ↓
Explicit response mapping → browser-friendly result
```

Controllers define routes and validate input. Facades select implementations. PHP adapters translate to the legacy module/action/step conventions and map responses back into the web contract. Shared transport and error utilities handle recurring legacy quirks such as mixed identifier types, unknown-date sentinels and a failed operation arriving with HTTP 200.

The main-branch replacement identity and media services are still skeletons that report `NOT_IMPLEMENTED`. `API_MODE` defaults to the legacy implementation; per-module overrides provide a future cutover mechanism. Enabling a new mode requires implemented and verified behavior behind that contract.

## A request, from click to confirmation

Consider a member editing a story:

1. The frontend collects the content and checks the form's required values.
2. The typed client sends the request to the BFF with the current session credential.
3. NestJS validates the request and constructs the operation context.
4. The story adapter builds the exact payload the PHP API expects.
5. PHP applies its business operation and returns the result.
6. The BFF maps that result or failure into its consistent envelope.
7. The frontend displays the confirmed state or an actionable error.

The API envelope separates `data`, `error` and `meta`, including a request identifier for tracing. Client validation improves usability; server validation and authorization still determine whether a request may proceed. A successful HTTP response also needs the right business result and durable backend state—deletion and upload regressions showed why payload fidelity and read-back verification matter.

## Authentication and identity continuity

Password, social and OTP flows use BFF identity routes while compatibility mode delegates the underlying account operation to PHP. The BFF issues access and refresh tokens; the web client includes the current credential when it makes an application request and has a refresh/retry path.

Where PHP supplies `logged_in_user_id`, the BFF maps it to `userId`, retains it in session claims and exposes the mapped ID in the login response. This provides identity continuity without asking each page to interpret the legacy field. Older or incomplete responses can require fallback handling; a missing ID must not be invented.

OAuth authentication and importing photos from a social provider are distinct workflows. Each needs correct provider configuration and callback handling. Provider client secrets belong in server configuration, while the member's access rights still need to be enforced for every protected operation.

The current browser session mechanism includes client-readable cookies. This guide does not claim that tokens are HttpOnly or that the migration has completed a security audit. Cookie policy, refresh-token revocation, rate limiting and upstream authorization are production-review items.

## Image optimization and media delivery

The frontend's image configuration allows selected media hosts, enables AVIF/WebP output, defines responsive widths and quality choices, and sets a 30-day minimum image-cache TTL. These are inspected configuration values, not a measured guarantee of every image's size or load time.

Responsive `next/image` candidates help the browser select a suitable image size. Lazy loading postpones off-screen image loads, and reserved dimensions reduce layout movement. On-demand transforms use CPU and memory; cached variants reduce repeat work. Updated images need a suitable URL/version strategy so a long-lived cache does not show an old picture. [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image)

Original files remain at the media origin. Next.js image optimization does not transcode audio/video, enforce total upload limits, or generate speech transcripts. Those are separate workflows. Private media also needs an authorized delivery design: the default image optimizer does not forward browser authentication headers when fetching from the source.

Main-branch uploads use BFF media routes and the legacy chunk/compile protocol. The AWS POC adds a different path with private object storage and owned media metadata. Its historical transcription limitation belongs to that path; it should not be presented as the status of every legacy upload. See [media upload limits](media-upload-limits.html) and the [POC record](yourstorieslive-aws-media-poc-record.html).

## Deployment and scaling choices

Next.js and the BFF are separate deployable processes. They can run in separate containers on one EC2 instance initially, or on separate hosts/services when traffic, availability or team ownership justifies it. CloudFront can deliver/cache eligible assets, Route 53 manages DNS, and a reverse proxy routes requests to the appropriate app. An EC2 Auto Scaling Group with a load balancer is one expansion option; ECS is another.

Those choices are deployment designs, not a claim that a particular production topology is currently running. Before selecting capacity, measure real image-transform load, concurrent uploads, memory, upstream latency and media transfer. A small instance supporting typical browsing may perform differently during a batch of uncached images.

Multiple application instances require consistent builds and configuration, shared handling of any server-local session state, and an explicit cache/invalidation strategy where required. Image caches can be local, but replacement instances start cold. Private API responses must not become publicly cached. [Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting)

## What enables the next migration stage

| Stage | Completion evidence |
| --- | --- |
| UI migration | Named member journeys work through the BFF on desktop and mobile. |
| Compatibility hardening | PHP adapters preserve data, errors, permissions and side effects across those journeys. |
| Owned backend replacement | A new implementation passes the same contract and authorization tests, with real persistence. |
| Data migration | Reviewed inventory, identifier/relationship mapping, reconciliation and rollback exist. |
| Per-domain cutover | Traffic changes only after verification; post-cutover writes and rollback consequences are accounted for. |
| Retirement | PHP dependencies are removed only when all required consumers and operational workflows are covered. |

The BFF provides a place to replace services gradually. It does not itself migrate old records, remove upstream latency, or make unfinished services production-ready.

## Evidence and related reading

Inspected main-branch snapshots: frontend `2cc2574`, BFF `795dd0b`, on 10 October 2026. This was code/document inspection, not a fresh live acceptance test or infrastructure audit. Older integration summaries contain stale rows, so current service code takes precedence for this guide.

Key source areas: frontend `next.config.ts`, `app/`, `src/features/`, `src/config/site.ts`, `src/lib/api/client.ts`, `src/lib/api/http.ts` and `src/lib/utils/auth-tokens.ts`; BFF `src/main.ts`, `src/app.module.ts`, `src/config/api-mode.config.ts`, `src/auth/`, `src/legacy/` and `src/modules/`.

- [Features and member workflows](application-features.md)
- [Stakeholder migration FAQ](stakeholder-migration-faq.md)
- [Phase 1 delivery briefing](yourstorieslive-phase1-stakeholder-demo.html)
- [NestJS controller guidance](https://docs.nestjs.com/controllers)
- [NestJS validation guidance](https://docs.nestjs.com/techniques/validation)
