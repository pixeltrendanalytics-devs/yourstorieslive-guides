# Google Analytics and GTM setup for Vercel

Recorded: 18 October 2026 · Audience: developers, marketing and application owners

YourStoriesLive has a separate Google Analytics 4 (GA4) property and Google Tag
Manager (GTM) container for `yourstorieslive.vercel.app`. This guide records the
resources created, the configuration applied, how the frontend connects to them,
and how to verify and operate the integration later.

**Current status:** the Google-side setup is complete and GTM version 2 is
published. The frontend integration is still local on
`feature/ga4-base-traffic-sources`, disabled by configuration. It has not been
committed, pushed or deployed as part of this setup. Publishing GTM does not
install tracking on the website. Live collection and attribution still require
deployment and browser verification.

The existing production Analytics property and production tags were not changed.
Do not reuse this guide as authorization to change them.

## Purpose and phase boundaries

The first phase establishes traffic-source reporting and page views split by
the visitor's selected application language. SEO is the primary acquisition
channel, so search traffic, referrals, social campaigns and direct visits matter
before adding product events.

| Question | Phase 1 coverage | Later work |
| --- | --- | --- |
| Where do visitors come from? | GA4 acquisition reports using referrer and approved UTM campaigns | Search Console linking and SEO analysis |
| Which pages do visitors use? | Sanitized manual page views and client-side navigation | Further engagement analysis |
| English versus Korean? | Event-scoped App language dimension from the selected app locale | Split funnel and revenue reports after those events exist |
| Do visitors sign up and create a first story? | Not implemented in this phase | Signup and activation events |
| Do members invite family or schedule video messages? | Not implemented in this phase | Engagement events |
| Which paid plans do people buy? | Not implemented in this phase | Checkout, purchase and plan reporting |

GTM is the delivery layer for measurement tags; GA4 stores and reports the
measurement data. A GA account, a GA4 property, a web stream and a GTM container
are different resources. None of them is a Google Cloud project or a new Vercel
hosting project, and this setup did not create either of those.

## Resource inventory

| Resource | Name or value |
| --- | --- |
| Website in scope | `https://yourstorieslive.vercel.app` |
| GA account | YourStoriesLive Vercel — `412244232` |
| GA4 property | YourStoriesLive Vercel — `559392476` |
| Reporting timezone | Singapore |
| Reporting currency | USD |
| Web stream | YourStoriesLive Vercel Web |
| Stream ID | `16148937030` |
| GA4 measurement ID | `G-Z8SKRD2JRK` |
| GTM account | YourStoriesLive Vercel — `6383131686` |
| GTM container | yourstorieslive.vercel.app — `267469091` |
| GTM public container ID | `GTM-M45F7QHK` |
| Published GTM version | 2 — Vercel base analytics - consent gated |
| Custom dimension | App language, Event scope, parameter `language` |

Use the existing company-controlled Google login that owns these resources.
Do not create duplicates just because another account opens by default. Google
account switcher positions such as `authuser=2` are browser-session details, not
permanent account identifiers.

Open [Google Analytics](https://analytics.google.com/) or
[Google Tag Manager](https://tagmanager.google.com/) and select the resource by
name and ID before editing. Measurement and container IDs are public browser
configuration, not secrets. They do not grant management access. Passwords,
tokens, cookies, service-account keys and private member data must not enter
this documentation repository.

## Isolation from production

An existing production property named YourStories was already available. It was
inspected without modifying it. Property creation was unavailable within that
account, and the requested rollout needed a separate Vercel reporting destination,
so a new GA account and property were created.

The new GTM container is also separate. Its measurement trigger requires the
exact hostname `yourstorieslive.vercel.app`; the frontend has an independent
hostname allowlist. Production domains, arbitrary Vercel preview domains and
localhost are not allowed by the recorded configuration.

Historical production data remains in its original property. It does not migrate
into the new property. Production tagging, Shopify, advertising integrations,
Search Console and cross-domain tracking remain outside this setup.

## Create the GA4 account and web stream

These are the steps used to create the resources above. For normal maintenance,
open the existing resources rather than repeating account creation.

1. In Analytics, open **Admin → Create → Account**. Name the account
   **YourStoriesLive Vercel**.
2. Disable every optional account data-sharing choice: Google products and
   services, modeling contributions, technical support and recommendations.
   The interface may describe these choices differently over time; inspect each
   checkbox rather than accepting the defaults.
3. Create property **YourStoriesLive Vercel**, with reporting timezone
   **Singapore** and reporting currency **USD**.
4. Setup metadata used **People & Society**, **1–10 employees**, and the objectives
   **Understand web/app traffic** and **View user engagement/retention**. These
   choices organize the initial reporting experience; they are not application
   event instrumentation.
5. Complete the required terms and data-processing acceptance only with the
   account owner's authorization. That authorization was supplied for this setup.
   Optional data sharing is a separate choice and stayed disabled.
6. Create a **Web** stream with URL `https://yourstorieslive.vercel.app`, named
   **YourStoriesLive Vercel Web**.
7. Turn **Enhanced Measurement off** and confirm the change. Record the stream ID
   and measurement ID from the stream details.
8. Do not paste the offered direct `gtag.js` installation snippet into the app.
   This integration loads GTM after consent; adding the snippet would create a
   second collection path.

Enhanced Measurement can detect additional interactions, including history-based
page views. Disabling it avoids a parallel automatic path that could bypass the
app's sanitized event payload or duplicate SPA page views.
[Google Enhanced Measurement reference](https://support.google.com/analytics/answer/9216061)

## Register the application language

In the new property, open **Admin → Data display → Custom definitions → Create
custom dimension** and save:

| Field | Value |
| --- | --- |
| Dimension name | App language |
| Scope | Event |
| Description | Selected application language, independent of browser language |
| Event parameter | `language` |

This dimension was saved in the Vercel property. The app sends locale values
such as `en` and `ko`. Use **App language** when comparing the chosen UI language;
do not substitute GA's browser-derived Language dimension. Registration does not
backfill historical events, so create dimensions before relying on their reports.

## Create the GTM account and container

1. In Tag Manager, create account **YourStoriesLive Vercel**.
2. The account country was set to **United States**. This account setting is
   separate from the GA property's Singapore reporting timezone.
3. Leave **Share data anonymously with Google and others** unchecked.
4. Create container **yourstorieslive.vercel.app**, targeting **Web**.
5. Accept required GTM terms and the processing terms with the account owner's
   authorization. Do not opt into unrelated sharing.
6. Record public container ID `GTM-M45F7QHK` and close the installation instructions.
   Do not insert the default snippet or its noscript iframe into this app.

The app already owns the consent-gated GTM loader. An unconditional GTM snippet
or noscript iframe would bypass that loading decision.

## Disable the container collection defaults

The new GTM interface introduced container-level collection settings when the
Google Analytics destination was added. These are independent of the GA stream's
Enhanced Measurement switch. Both layers were configured.

Under the Vercel container's **Workspace → Settings**:

| Setting | Configuration applied |
| --- | --- |
| Page views on browser history change | Off |
| Scrolls | Off |
| Outbound clicks | Off |
| Form interactions | Off |
| Video engagement | Off |
| File downloads | Off |
| Allow user-provided data capabilities | Off |
| Automatically detect user-provided data | Off before disabling the parent capability |

Do not enable automatic email, phone, address or other page-content detection.
Google Signals and user-provided-data collection are not part of this phase.
Turning off these interaction features does not mean GA4 has no automatically
collected lifecycle events, such as session-related events. Verify actual requests
in the browser; the application-defined event in this phase is `page_view`.

## Configure the data layer variables and triggers

Create six **Data Layer Variable** entries, each using **Version 2**:

| GTM variable name | Data layer key |
| --- | --- |
| DLV - event_id | `event_id` |
| DLV - page_location | `page_location` |
| DLV - page_referrer | `page_referrer` |
| DLV - page_title | `page_title` |
| DLV - page_path | `page_path` |
| DLV - language | `language` |

Enable the built-in **Page Hostname** and **Event** variables. The hostname is
used only to restrict firing; it is not a replacement for sanitized page context.

Create these custom-event triggers:

| Trigger name | Exact custom event | Additional condition |
| --- | --- | --- |
| CE - ysl_consent_update | `ysl_consent_update` | None |
| CE - page_view - Vercel only | `page_view` | Page Hostname equals `yourstorieslive.vercel.app` |

Keep regular-expression matching off. Do not add All Pages, History Change,
click, timer or form triggers to the measurement tag.

## Build the consent controller

The integration follows a basic consent-gated loading approach: before acceptance,
the app does not load GTM or send GA measurement events. Consent Mode settings
alone are insufficient for that requirement because Google tags can otherwise
support measurement without analytics cookies.

Create an owned **Tag Template** named **YSL - Consent control**. Use sandboxed
JavaScript, not a Custom HTML tag. Replace the editor's boilerplate completely
with this code; there are no configurable template fields:

```javascript
const setDefaultConsentState = require('setDefaultConsentState');
const updateConsentState = require('updateConsentState');
const copyFromDataLayer = require('copyFromDataLayer');

if (copyFromDataLayer('event') === 'ysl_consent_update') {
  updateConsentState({
    analytics_storage:
      copyFromDataLayer('analytics_storage') === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
} else {
  setDefaultConsentState({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}
data.gtmOnSuccess();
```

Under **Permissions**, permit only:

- **Accesses consent state:** write access to `analytics_storage`, `ad_storage`,
  `ad_user_data`, and `ad_personalization`. Read access is not required.
- **Reads data layer:** specific keys `event` and `analytics_storage`, one per line.

No script injection, network, DOM, cookie or console-logging permissions are
needed. Remove the initial logging boilerplate so a log permission is not retained.

Create tag **YSL - Consent defaults and updates** using this template. Fire it on
**Consent Initialization – All Pages** OR **CE - ysl_consent_update**. Set
Additional Consent Checks to **No additional consent required**, so both grants
and withdrawals can always be processed.

**Consent Initialization is not Initialization.** The published version was
checked specifically for this distinction. For container JSON imports, the built-in
Consent Initialization trigger ID is `2147479572`; ordinary Initialization is
`2147479573`. Prefer the named UI choice and verify after importing.

Google recommends the template consent APIs because consent updates must be
processed before subsequent measurement events, rather than queued as ordinary
`gtag` commands.
[Google consent template documentation](https://developers.google.com/tag-platform/tag-manager/templates/consent-apis)

## Configure the GA4 measurement tags

### Base tag

Create **GA4 - Vercel - Base (sequenced only)**, using measurement ID
`G-Z8SKRD2JRK`. The setup UI called its type **Google Analytics**; other GTM
versions may call the base configuration a Google tag.

Configure these parameters:

| Parameter | Value |
| --- | --- |
| `send_page_view` | `false` |
| `allow_google_signals` | `false` |
| `allow_ad_personalization_signals` | `false` |
| `page_location` | `{{DLV - page_location}}` |
| `page_referrer` | `{{DLV - page_referrer}}` |
| `page_title` | `{{DLV - page_title}}` |
| `language` | `{{DLV - language}}` |

Set firing to **Once per page**. Leave it with **no standalone firing trigger**;
it is a setup tag for the event below. Under Additional Consent Checks, select
**Require additional consent for tag to fire** and add `analytics_storage`.

### Manual page view tag

Create **GA4 - Vercel - Manual page_view**, type **Google Analytics: GA4 Event**:

- Measurement ID: `G-Z8SKRD2JRK`.
- Event name: `page_view`.
- Event parameters: map all six data layer keys in the variable table to their
  matching GTM variables, including `event_id` and `language`.
- Firing trigger: **CE - page_view - Vercel only**.
- Firing option: **Once per event**.
- Additional Consent Checks: require `analytics_storage`.
- Tag Sequencing: fire the base tag before this event, and stop the event if the
  setup tag fails.

This sequence initializes GA with sanitized context from the first allowed page
view. Do not substitute built-in Page URL, Referrer, page titles from member
content or DOM-scraped values. Do not add a second direct GA snippet.

## Publish and preserve the configuration

The setup used a JSON container import in the newly created Vercel workspace,
then inspected the resulting tags, variables, consent requirements, hostname
condition and trigger ordering in the UI. An import is not proof of correct
configuration: GTM remaps internal IDs, and imported references need review.

The import source is in the frontend repository at
`app-info/gtm-vercel-base-container.json`. It belongs only to this Vercel setup.
Do not overwrite another container with it. Export the current live version
before any future import, review the diff and confirm the target public ID.

At **Submit**, the optional read-only destination account link was declined.
No new account link or user access was granted. Version 2 was published with
name **Vercel base analytics - consent gated**. The UI confirmed **Version 2 is
Live**, with three tags, two custom triggers, six user-defined variables and
two collection settings. The consent template is also part of the version.

Publishing passed Google's container validation. Separately, local checks
exercised consent initialization, grant, denial and invalid-state fallback.
Neither check replaces live Tag Assistant, network or GA4 DebugView verification.

## Connect the frontend and Vercel deployment

Set the following public build-time variables only on the Vercel project serving
the approved hostname. Start with collection disabled:

```dotenv
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-M45F7QHK
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-Z8SKRD2JRK
NEXT_PUBLIC_GTM_SCRIPT_URL=https://www.googletagmanager.com/gtm.js
NEXT_PUBLIC_ANALYTICS_ALLOWED_HOSTS=yourstorieslive.vercel.app
```

In **Vercel project → Settings → Environment Variables**, select the deployment
environment used by this Vercel site. Vercel's label “Production” can mean the
primary deployment of this test-hosting project; it does not authorize modifying
the separate business production application. Confirm the project, repository
and served hostname before saving anything. These Vercel environment settings
were not applied during the recorded Google-side setup.

Deploy the reviewed frontend code. Then use an approved verification deployment
with `NEXT_PUBLIC_ANALYTICS_ENABLED=true` to exercise the integration on the
allowed host. Keep that value only after acceptance checks pass; revert it and
rebuild if they fail. Public Next.js variables are embedded at build time, so
changing them without a rebuild does not update an already-built browser bundle.
Do not widen the hostname allowlist merely to make an arbitrary preview work.

The app disables analytics when the enable flag is not exactly `true`, either ID
is missing/invalid, the script URL is invalid, or the hostname is not allowed.
In that case, both tracking and the analytics consent UI remain disabled.

### Frontend implementation map

Paths below are relative to the frontend repository, not this guides repository:

| Location | Responsibility |
| --- | --- |
| `src/lib/analytics/config.ts` | Validate enable flag, IDs, script URL and exact allowed host |
| `src/lib/analytics/page-context.ts` | Allowlisted paths, generic titles, language and sanitized attribution |
| `src/lib/analytics/runtime.ts` | Consent persistence, UUIDs, queued events and duplicate suppression |
| `src/components/analytics/use-analytics.ts` | React integration with pathname, selected locale and consent changes |
| `src/components/analytics/analytics.tsx` | Consent-gated Next Script loader and preferences UI |
| `src/components/analytics/analytics-consent-banner.tsx` | Localized banner presentation |
| `src/components/i18n/locale-shell.tsx` | Shared integration point across route groups |
| `src/messages/*.json` | Consent strings, including English and Korean |
| `__tests__/lib/analytics.test.ts` | Runtime, configuration and page-context tests |
| `__tests__/components/analytics.test.tsx` | Loader and consent component tests |

The consent UI has an inert development preview at
`/kitchen-sink#analytics-consent`. It does not grant consent or load tracking.

## Consent and page view lifecycle

```text
Allowed host and complete enabled configuration
                  |
         Restore stored consent
                  |
      No choice or denied ── no GTM or GA measurement loading
                  |
         Visitor allows analytics
                  |
      Queue ysl_consent_update with analytics granted and ads denied
                  |
      Queue GTM startup and sanitized page_view
                  |
      Load GTM with Next Script
                  |
      Consent Initialization defaults all four signals to denied
                  |
      Consent controller processes the queued grant
                  |
      Host-restricted page_view trigger → base setup → GA4 event
```

The app stores only the consent choice under `ysl-analytics-consent-v1` in local
storage. If storage is blocked, the choice works in memory for the document.
Changes in another tab are applied. Cookie preferences lets the visitor change
the choice later.

Allow grants only analytics storage. The three advertising signals remain denied.
Withdrawal updates consent and sets `ga-disable-G-Z8SKRD2JRK`; it does not unload
previously downloaded JavaScript, erase historical GA data or implement cookie
deletion. Test withdrawal separately from a fresh visit that rejects consent.

A browser-document singleton prevents duplicate startup and identical page views
after React rerenders or layout remounts. Route and language changes can produce
new views. Query-only filters, selected-photo parameters and modal changes do not.
Pages visited before consent are not replayed after acceptance.

## Privacy and traffic attribution

The runtime does not send names, email addresses, story text, captions, filenames,
member slugs, authentication tokens or application user IDs. This phase does not
set GA's `user_id`. Google may still process standard network/browser information
and analytics identifiers after consent; sanitizing the application payload does
not make analytics anonymous or eliminate the need for a suitable privacy policy.

| Input | Treatment |
| --- | --- |
| Public and approved app paths | Track only allowlisted paths |
| `/user/<member-slug>` | Normalize to `/user/member` |
| Locale prefixes | Normalize to a shared page path; retain selected locale as `language` |
| Page title | Generate a generic application title, not member content |
| Query strings and fragments | Exclude except approved initial UTM slugs |
| External referrer | Retain HTTP(S) origin only, not its path/query |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_id` | Allow lowercase ASCII letters, digits, underscores and hyphens, up to 100 characters per value |
| `utm_term`, click IDs and other parameters | Exclude in this phase |
| Unknown paths, callbacks, kitchen sink and `story-global` invitation/collaboration routes | Exclude in this phase |

Approved campaign values and the original external referrer are captured in memory
at startup. They can survive client-side navigation before consent and attach to
the first permitted view. A full-document navigation before consent may lose
that context unless campaign values remain in the URL. No campaign state is
persisted before consent.

Use controlled campaign names without personal information, for example:

```text
https://yourstorieslive.vercel.app/?utm_source=instagram&utm_medium=social&utm_campaign=family_stories
https://yourstorieslive.vercel.app/ko?utm_source=naver&utm_medium=social&utm_campaign=korean_launch
```

Do not add UTMs to internal links; that would confuse attribution. GA4 determines
channels from attribution data; the frontend does not invent its own channel
classifier. A visit without usable referral/campaign evidence must not be relabeled
as organic. Paid advertising and click-ID handling need a later design review.

## Read the traffic and language reports

After collection is deployed and verified, use these reports in the **Vercel**
property, not the existing production property:

| Report | Use |
| --- | --- |
| Realtime | Check whether accepted-consent test visits are arriving |
| DebugView | Inspect QA events and parameters when debug mode is enabled for that test session |
| Traffic acquisition | Compare session default channel group and session source/medium |
| User acquisition | Compare the original acquisition source of new users |
| Explore | Build comparisons using App language, page path, source/medium and compatible metrics |

Report navigation depends on the property's report collection. If an acquisition
report is not visible in the sidebar, an editor can locate and publish the
relevant report collection; do not create another property to obtain the menu.
[Google Traffic acquisition reference](https://support.google.com/analytics/answer/12923437)

For an English/Korean comparison, create a free-form exploration, import **App
language** and a compatible source/page dimension, add metrics such as event count
or users, and filter language to `en` and `ko`. Inspect any metric/dimension
compatibility warnings. A language-change page view is intentional, so page-view
counts are not counts of unique people.

Consent refusals, blockers, excluded routes and reporting latency affect the
numbers. New custom dimensions can take time to become available in processed
reports. Search Console linking is separate future work requiring verified site
ownership and access; GA installation alone does not expose search queries or
prove SEO performance.

## Deployment acceptance checklist

Use an authorized test browser session and the Vercel property. Do not enable
debug mode for every visitor or send fabricated production conversions.

- [x] Separate GA account, property, stream and GTM container created.
- [x] Optional account sharing disabled and no destination account link added.
- [x] Enhanced Measurement off in the stream.
- [x] Container automatic interaction detection and user-provided-data capabilities off.
- [x] App language dimension saved.
- [x] Consent Initialization and the exact update trigger verified in published version 2.
- [x] Measurement tags require analytics consent and page-view firing is host restricted.
- [x] Container publication validation and four local consent-controller scenarios passed.
- [ ] Review and deploy the local frontend integration; configure the correct Vercel environment.
- [ ] Align the privacy policy with the consent interface and actual collection.
- [ ] Fresh storage, before choice: no GTM or GA measurement requests.
- [ ] Reject: no GTM or GA measurement requests.
- [ ] Allow: one GTM load and one initial application page view.
- [ ] Verify all four consent signals: analytics granted only after allow; advertising denied.
- [ ] Inspect initial and subsequent GA requests for sanitized URL, title, referrer and language.
- [ ] Check navigation, back/forward, rerenders and layout remounts for duplicate page views.
- [ ] Switch English/Korean and verify the selected language in the event payload.
- [ ] Open filters/modals without navigation and confirm they do not generate extra views.
- [ ] Check excluded routes and return navigation without leaking IDs or content.
- [ ] Test direct, social UTM, external referral and real search-referral journeys.
- [ ] Withdraw in the same tab and another open tab; verify subsequent measurement stops.
- [ ] Confirm non-allowed hosts, including localhost, do not load the integration.
- [ ] Confirm events in the Vercel property and the language dimension in processed reports.

Network inspection and Tag Assistant establish firing and payload behavior;
Realtime/DebugView establish receipt. A single “tag detected” indicator does not
establish all of these conditions.

## Troubleshooting and rollback

| Symptom | Check first |
| --- | --- |
| No banner and no GTM | Enable flag, exact hostname, both IDs, script URL and a fresh build |
| GTM loads but no GA page view | Consent Initialization ordering, analytics consent requirement, exact event name and hostname condition |
| Duplicate page views | Direct GA snippet, second GTM install, automatic history views, Enhanced Measurement or extra measurement triggers |
| No traffic after publishing GTM | Whether the frontend code and build-time variables were actually deployed |
| Names or full URLs in requests | Built-in URL/title/referrer substitutions, automatic user data, additional tags or unreviewed template changes |
| Locale looks like browser language | Use the App language custom dimension and verify the `language` payload |
| UTM missing | Allowed character/length rules, pre-consent full reload and whether this is the first permitted page view |
| Nothing in DebugView | Enable debugging only for the QA session; also inspect requests, consent and blockers |
| A “No Recent Data” container warning | Expected before installation/traffic; not a reason to remove consent safeguards |

For a deployment problem, set `NEXT_PUBLIC_ANALYTICS_ENABLED=false` and rebuild
the affected Vercel app. This stops new app loads from initializing analytics;
already-open browser documents may still have the previous bundle until reload.
If the container is at fault, use GTM Versions to publish a known safe prior
version of **this Vercel container**. Version 1 was the empty container, so using
it stops the configured measurement tags but also removes the configured consent
controller from that container version. Record the rollback and reverify before
restoring measurement. Never roll back the separate production container.

Restrict tag publishing to approved maintainers. A future container change can
defeat frontend privacy protections even without a frontend code change. Review
tags, templates, permissions, automatic collection settings and destinations for
every publication; retain an export of accepted versions.

## Later implementation phases

The analytics brief reserves these application events for later work:

| Event | Intended purpose |
| --- | --- |
| `sign_up` | Signup completion |
| `story_created` | Story creation and activation; `story_index=1` identifies the first story |
| `invite_sent` | Family/contact invitation engagement |
| `comment_requested` | Collaboration engagement |
| `video_message_scheduled` | Future-message engagement |
| `begin_checkout` | Entry to the purchase funnel |
| `purchase` | Confirmed purchase and plan revenue |

Define exact trigger points, allowed parameters, deduplication and consent
behavior before adding these tags. Purchase reporting must use confirmed payment
outcomes and transaction deduplication. USD is the agreed reporting currency.
Shopify checkout integration, cross-domain linking, Meta Pixel and CAPI are not
implemented by this base setup. Preserve UUIDv4 `event_id` conventions for future
deduplication; do not add advertising collection under analytics-only consent.

## Reference locations

- Frontend repository: `app-info/google-analytics-base-setup.md` for developer setup notes.
- Frontend repository: `app-info/gtm-vercel-base-container.json` for the import source.
- [Google Analytics page view guidance](https://developers.google.com/analytics/devguides/collection/ga4/views).
- [Google consent template APIs](https://developers.google.com/tag-platform/tag-manager/templates/consent-apis).
- [Google consent configuration guidance](https://developers.google.com/tag-platform/security/guides/consent).
- [Google Enhanced Measurement reference](https://support.google.com/analytics/answer/9216061).
- [Google Traffic acquisition report](https://support.google.com/analytics/answer/12923437).

Google's navigation and tag labels can change. Match the intended setting and
resource ID rather than relying only on an old screenshot or menu label.
