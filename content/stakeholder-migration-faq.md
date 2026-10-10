# Stakeholder FAQ: migrating PHP to a modern web application

Reviewed: 10 October 2026 · Audience: owners, stakeholders and delivery teams

These answers explain the current Next.js + NestJS BFF migration and the decisions it leaves open. They separate observed implementation from proposed deployment and future backend replacement. For the supporting detail, open the [architecture guide](application-architecture.md), [feature map](application-features.md) or [Phase 1 presentation](yourstorieslive-phase1-stakeholder-demo.html).

## Purpose and scope

### 1. What are we actually migrating?

The member and public web interfaces are moving from PHP-rendered screens to Next.js. A NestJS BFF now provides the application API boundary between those screens and the established PHP services. Most legacy business operations still depend on PHP. Full backend/data ownership is a later, separately verified milestone.

### 2. Why change the UI if the owners already know the product?

The aim is better use of the existing product: clearer feedback, reusable controls, responsive screens, consistent navigation, richer media interactions and a codebase that is easier to maintain and test. It also creates room for improvements such as member discovery and connected workflows. The business case should be measured through task completion, reliability and performance, rather than the technology names alone.

### 3. Why do we need a BFF? Could Next.js call PHP directly?

Direct calls are possible, but they make each screen responsible for legacy payloads and response quirks. The BFF translates those contracts in one place, validates requests and gives the UI consistent results/errors. It also provides a boundary behind which a service can later be replaced. That benefit adds another deployed component to operate and monitor.

### 4. Does Next.js replace NestJS, or vice versa?

They have different responsibilities. Next.js serves the web interface and runtime web features such as the image endpoint; NestJS serves the application API and integration layer. They can run on the same host initially, while remaining separate processes and repositories.

### 5. Does “Phase 1 built” mean everything is ready to launch?

It means the defined implementation scope has been delivered to the stated level in a dated record. Launch acceptance also needs verified permissions, provider configuration, real backend outcomes, mobile behavior, performance, monitoring and operational readiness. A visible screen, an API route and an end-to-end working journey are different levels of completion.

## Existing accounts, data and behavior

### 6. Will existing members need new accounts or passwords?

Compatibility mode uses the existing account operations through PHP. The UI migration does not itself require re-registering everyone. Existing sessions may still require reauthentication when credentials, domains or session handling change. A future identity-provider/backend replacement needs its own account/session migration plan.

### 7. Are existing stories, contacts and photos copied into a new database?

The UI migration does not automatically copy that data. Compatibility adapters continue to use existing services. The separate AWS media POC introduces owned media storage/metadata for its selected path; old-media inventory, copying, identifier mapping and reconciliation are separate migration tasks. See the [legacy media pilot guide](legacy-media-pilot-migration-guide.html).

### 8. Who is the source of truth during this stage?

For a legacy-served operation, PHP and its underlying data remain authoritative. The browser's Redux state is a display cache, not durable storage. The BFF maps and orchestrates the operation; it does not become the source of truth simply by relaying the result. Owned media/database paths need their own explicitly documented ownership rules.

### 9. How do we know a save or deletion actually worked?

A success toast alone is insufficient. Acceptance checks should verify the right payload, the backend's business result, a reload/read-back and the related story/contact state. Deleting linked media especially needs impact confirmation and durable verification. The adapter must not confuse an upstream HTTP 200 with a successful business operation.

### 10. Can we keep PHP running alongside the new application?

Yes, coexistence is the migration model. Both interfaces may operate against the same established services. We need coordinated backend changes and contract tests so improving one interface does not silently break the other. Shared data semantics, audience rules and callback registrations need deliberate compatibility management.

### 11. Can we switch back if a rollout fails?

Application versions can be rolled back when the deployment preserves a known-good image/configuration. Routing members back to the old UI may also be possible under an agreed coexistence plan. Data rollback is harder: once a new backend accepts writes, reverting a flag does not reconcile those writes. Each cutover needs explicit recovery rules and tested backups where data moves.

## Media, performance and user experience

### 12. What does Next.js do for our photographs?

The standalone app can generate responsive, optimized image variants and reuse cached results. Good dimensions and lazy loading help the layout and reduce unnecessary loads. A CDN can further reduce repeat origin requests. The original remains separate. Benefits depend on layout configuration, source availability and cache behavior; they should be measured against representative pages. [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image)

### 13. Does that also optimize videos and produce transcripts?

No. Video/audio delivery, transcoding and speech transcription are separate services/workflows. The main compatibility path has a legacy transcription request; the independent AWS media POC has a different limitation. Neither image optimization nor a successful upload establishes transcript availability or a saved story.

### 14. Can members record until the upload limit is reached?

The recorder provides accumulating file-size feedback and a guard that stops close to the hard limit, retaining the result for preview/upload. That reduces the risk of wasting a long recording. Browser/media errors and a large final chunk still need handling, and a size guard is not a universally enforced duration limit. The dated [upload limits reference](media-upload-limits.html) records the known thresholds.

### 15. Will the new app always be faster?

That is an outcome to prove, not a framework guarantee. Responsive delivery and caching can improve browsing, but an uncached image transform or slow PHP request can still dominate latency. Measure representative mobile pages, first/repeat loads, API timings, upload stages and failure recovery. A BFF adds a network hop even as it simplifies the contract.

### 16. Will every feature work on phones and in nine languages?

The UI has mobile layouts and nine locale catalogs. Some controls and editorial content have narrower coverage, and recording depends on browser/device permissions. Runtime translation also has a fallback and is not a guarantee of translated member content. Acceptance should name the supported devices, browsers, locales and journeys explicitly.

## Security and privacy

### 17. Is this automatically more secure because it is modern?

Security depends on implementation and operation. The BFF provides validation, response mapping and authentication infrastructure, but production controls still require review: authorization, session storage, credential revocation, rate limiting, provider settings, logs and cache rules. A frontend route guard or hidden button cannot enforce backend access rights.

### 18. Where do credentials and user IDs live?

Provider/client secrets belong in server-side configuration. The BFF captures the legacy user ID when supplied and carries it through the session and mapped login response. Browser-visible IDs are identifiers, not permission grants. Current browser session cookies are client-readable; stronger cookie/session policies must be evaluated before making security assurances.

### 19. Can caching reveal private stories or photographs?

It can if the delivery policy is wrong. Shared CDN caches must not serve one account's personalized API response to another account. Private media requires authorization at the delivery path; signed URLs, expiration and any optimized copies must be considered together. Making a source URL obscure is not equivalent to access control.

### 20. Are member search and sharing privacy decisions finished?

Some workflows are implemented, but visible personal fields, consent, contact matching, invitation scope and access revocation remain product/security decisions. Seeing a contact or a search result must not imply unrestricted access to that person's content. Test sharing with independent sender and recipient accounts, including deny and revoke scenarios.

## Hosting, cost and scaling

### 21. Do we need Vercel or ECS to run Next.js?

No. The configured standalone Node.js application can be self-hosted. A single EC2 server can run separate frontend/BFF containers initially; separate services/hosts are expansion options. ECS is a management choice rather than a prerequisite for image optimization. This GitHub Pages guides site is static documentation, not a place to host the authenticated application. [Next.js self-hosting documentation](https://nextjs.org/docs/app/guides/self-hosting)

### 22. Why did different deployment estimates have different totals?

They assumed different availability, networking and capacity: one server versus duplicate tasks, public ingress versus private egress/NAT, and optional managed services. Application compute is only one part of the bill. Include disks, load balancing, IPs, logs, backups, media storage, transfer and any separate database/services. Historical estimates should not be reused as a current quote.

### 23. Can the one-server setup autoscale?

Yes, by using an Auto Scaling Group and a load balancer, with each instance running the same application build/configuration. That scales both apps together in the combined-host design. One minimum instance favors cost, but failure recovery can cause downtime; two across separate Availability Zones provide a stronger availability baseline. Capacity, sessions, cache coordination and upstream limits must be checked before enabling scaling.

### 24. What grows the bill most in a media-heavy application?

The answer depends on usage. Stored originals/variants, viewer transfer, requests, video processing and uncached image transformations can matter more than ordinary page rendering. Use observed storage growth, cache hit rate, concurrent activity and viewer traffic to size a budget. Avoid expensive architecture commitments before measuring the expected workload.

## Delivery and the next increment

### 25. What is still incomplete?

Complete Gifts/Messages scheduling, Concierge booking and billing/upgrade journeys are not established by their visible layouts. There are also partial discovery/access controls, executor-related UI and profile/mobile polish. Most new backend replacement services remain skeletons. The [feature map](application-features.md) explains these boundaries instead of counting every menu entry as a finished feature.

### 26. What evidence should stakeholders ask for before approving launch?

| Evidence | What it should show |
| --- | --- |
| Named journey tests | Sign-in, create/edit story, media upload/delete, contact photos and collaboration work against the selected backend. |
| Multi-account authorization checks | Owners, recipients, invitees and unrelated users receive the right permissions and outcomes. |
| Data verification | Save/delete survives reload; linked records and ownership remain correct. |
| Browser/mobile checks | Supported devices can navigate, record, preview, edit and recover from errors. |
| Performance observations | Representative page/API/media timings, cold and warm cache behavior, and realistic concurrency. |
| Operational preparation | Repeatable deployment, rollback, secrets, monitoring, backups where needed and named support owners. |
| Scope decision | Known gaps and workarounds are accepted explicitly rather than implied complete. |

### 27. How should we replace the remaining PHP backend?

One bounded domain at a time. Implement the new service behind the BFF contract, prove behavior/authorization/data parity, migrate the relevant records with reconciliation, then route the selected domain to it. The existing mode configuration gives a switching mechanism; it does not supply the missing business logic or data migration. Retire PHP dependencies only after required users, jobs and operational paths are covered.

### 28. What decisions do the owners need to make next?

Agree the release acceptance scope; the privacy/access rules for discovery and sharing; the availability and recovery target; the media ownership/transcription plan; a cost budget based on measured usage; and responsibility for PHP contract changes, BFF operations and frontend support. These decisions determine the next implementation increment more usefully than adding unrelated technology.

## Basis of these answers

Inspected frontend main `2cc2574` and BFF main `795dd0b` on 10 October 2026. These answers are based on source/configuration and dated project records, not a new live audit or a guarantee about an uninspected production environment. Provider availability, costs and release status should be reviewed when a deployment is approved.

- [Application architecture](application-architecture.md)
- [Features and member workflows](application-features.md)
- [Phase 1 briefing](yourstorieslive-phase1-stakeholder-demo.html)
- [AWS media POC record](yourstorieslive-aws-media-poc-record.html)
