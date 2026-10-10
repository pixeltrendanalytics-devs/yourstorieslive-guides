# Application features and member workflows

Reviewed: 10 October 2026 · Audience: product owners, stakeholders and demo participants

YourStoriesLive helps members preserve their life stories, organize memories, connect those memories to people, and invite others to contribute. The modern frontend rebuilds those journeys in Next.js, backed by NestJS routes and existing PHP services.

This is a feature map of the inspected code, not a production acceptance certificate. **Implemented** means the UI and corresponding client behavior exist. **Partial** means there are useful implemented paths alongside gaps. **Planned/placeholder** means visible screens or designs do not establish a working service.

## The main member journeys

| Member goal | Where it happens | Connected information |
| --- | --- | --- |
| Tell a story | New Story, timeline and story page | Text, media, date, location, audience and contributors |
| Build a life record | Profile: Your Life, Moments, Education, Advice and Reflections | Life-stage answers, meaningful dates and personal perspectives |
| Preserve photographs | Photos/media library | Captions, people, dates, places, stories and sharing requests |
| Connect memories to people | Contacts and ancestry | Relationships, photos, comments and family-tree context |
| Contribute to another person's memory | Invitation/access links and collaboration screens | The correct story, contribution and permission context |

## Account access and getting started

**Status: implemented paths; provider and environment verification still required.**

The code includes registration, password sign-in, social authentication, password recovery and OTP/two-factor interactions. Successful login initializes a session and loads the member's details. The frontend supports token refresh so an expired short-lived access token can be renewed where the refresh session remains valid.

Onboarding/profile-completion screens collect missing details and guide the member toward a usable profile. The current route gate checks first name, last name, email and phone; a completeness flag alone is not the source of that decision. Public pages, member navigation and access-link navigation have different roles so an invitation recipient is not simply treated as a fully signed-in account owner.

Welcome slides introduce the application. Their browser-level behavior should not be described as a durable account-wide walkthrough history service.

## Dashboard

**Status: implemented dashboard with some dependent content still limited.**

The dashboard provides shortcuts to the timeline, photos, profile and related areas. Its greeting depends on time, and counters/profile guidance are populated from member data rather than treated as permanently fixed values. Loading states help distinguish data that is still arriving from a confirmed zero count.

Contribution and profile prompts connect to their related screens. A visually complete dashboard does not establish completed Gifts/Messages or Concierge services; those areas need their own backend workflows.

## Stories and timeline

**Status: implemented core story journeys.**

- Create and edit stories with rich text, photos, audio or video.
- Upload existing recordings or record supported audio/video in the browser, subject to permissions and browser capabilities.
- Enter a story date and location, with UI validation before submission.
- Browse chronological content, use search/filter/sort controls and jump between life-stage sections.
- Open an individual story, manage its audience and use supported edit/delete actions.
- Invite contributions and use timeline-copy/request decisions where the backend permits them.

The timeline connects stories to important moments and education entries; those are distinct content types. A story's media should remain linked to the right parent item when it is edited, shared or deleted.

Recordings have size feedback and a guard that stops near the hard limit while retaining the result. Upload, processing and transcription are distinct stages. A transcript is an editable convenience, not proof that a recording was stored or that a story was saved. The legacy transcription route exists; the AWS media POC has a separate limitation described in its record.

## Photos and media library

**Status: implemented core library and collaboration paths.**

The library groups media by month and provides search, sorting and filters. Members can select individual items or a month group, clear selection and act through the selection bar. A viewer provides a larger preview and the relevant caption/details, with a more compact mobile presentation.

Supported workflows include local upload; Facebook, Instagram and Pinterest imports; details for who/when/where/caption; story/contact relationships; adding selected photos to contacts; and sharing photos with another account through a contact. Recipients have an inbox with approve/deny actions. Requests and moderation depend on the recipient identity and the PHP response contract.

Deleting linked media has a confirmation path that explains its story/contact impact. A successful deletion must be verified against durable backend state, not only the disappearance of a thumbnail from the current browser view.

Image optimization, file validation and provider authorization are different concerns. Consult the dated [upload-limit reference](media-upload-limits.html) for the recorded limits rather than treating all media as having one universal cap.

## Contacts

**Status: implemented core contact workflows.**

Members can search/filter/sort contacts, add or edit a contact and open its details. The detail area connects relationship information to photos, commented stories and other available sections. Mobile navigation should present selected details without forcing the member through a long list first.

Contact photo controls include upload and supported social imports, a compact gallery, photo preview and deletion. Some flows create a contact without leaving the story/media action. These quick-create paths still need valid identity/contact details.

The contact-photo cap is **10 photos per contact**. Existing photos plus pending additions must fit within that cap, including when multiple contacts receive the same selection. Sharing a photo to another account is a delivery/approval workflow; adding it to a contact is an association workflow. They need different recipient and authorization rules even if both start with a contact picker.

## Ancestry

**Status: core tree interaction implemented; some backend-capable operations still lack complete UI.**

The family tree provides an interactive desktop view and a focused mobile view. Supported operations include reading the tree and adding, editing or removing relatives through the relevant forms. Read-only viewing of another member's ancestry depends on authorization.

Placing an existing contact in the tree and sharing the tree are separate operations whose UI readiness needs explicit verification. Their presence in an API inventory should not be counted as complete member-facing journeys.

## Profile: five connected areas

| Area | What members can do | What needs careful handling |
| --- | --- | --- |
| Your Life | Answer guided questions across life stages; use supported suggestions, skips and carry-forward behavior | Long answers, media previews, mobile dialogs and editing/deletion feedback |
| Important Moments | Record meaningful dates and descriptions, with an optional photo | Required fields, accurate date values and confirmation/loading during deletion |
| Education | Add education entries using the supported education list, name and year fields | Field-specific validation and delete confirmation |
| Your Advice | Save advice in supported written/recorded forms and categories | Recording/upload limits and transcript availability |
| Your Reflections | Write reflections about a contact/person, browse written/received entries and use visibility controls | Who may view or change an entry and whether media links remain correct |

**Status: implemented profile areas, with ongoing polish and backend-dependent edge cases.** Profile progress helps members identify missing information. Progress is a computed indicator, not proof that every profile subsection contains a complete life history.

## Discovery, notifications and settings

**Status: implemented paths with some partial controls.**

Header discovery searches members and opens the member page or supported contact/connect actions. Member pages assemble available content across profile/timeline/media-related views. Content availability and permissions determine what a visitor may see; having a tab does not grant access.

Some discovery actions such as “Ask to view” still need a completed product/API flow. Search coverage on phones and the personal fields shown in results also need product review. Do not promise access to another account merely because a search result is visible.

Notifications include an inbox, detail and supported read/hide actions. Settings cover personal details, password, privacy/access defaults and two-factor configuration. Connected-account management and appointing an executor are not complete member journeys merely because a section is visible.

## Public site and language support

**Status: implemented public routes; editorial coverage varies.**

The public surface includes the home page, product/features pages, how-it-works content, pricing information, About, FAQ, contact/support, resources and legal pages. The code includes search-engine metadata, sitemap and robots behavior for public discovery and separation from private member content.

Nine UI locales are configured. Some editorial/landing content remains English-only, while runtime translation of backend-authored text has a fallback. Language selection, full editorial translation and guaranteed machine translation are three different capabilities.

## Areas that remain planned or partial

| Area | Honest current description |
| --- | --- |
| Gifts & Messages | Layouts and some incidental counts/reads exist; complete creation, scheduling, recipient and delivery workflows are not established. |
| Concierge | The page presents an appointment concept; a complete booking/payment service is not established. |
| Billing/upgrades | Pricing pages exist; a finished checkout/upgrade/subscription journey is not established. |
| Executor/legacy planning UI | Some BFF operations exist; appointing an executor is not a complete frontend workflow. |
| Native backend replacement | Many new-path services are skeletons while PHP adapters serve the established operations. |
| Independent AWS media | A separate POC implementation and deployment record exist; historical-data migration and production acceptance remain separate work. |

## A useful stakeholder demo sequence

1. Sign in and show the profile-completion prompts and dashboard.
2. Create a story, including its date/location and a small media item.
3. Find it on the timeline, open it and inspect its media details.
4. Open a contact and demonstrate linked photos and the 10-photo validation.
5. Use a controlled second account to demonstrate sharing, approval/denial and permissions.
6. Open ancestry and the five profile areas.
7. Finish with remaining gaps and the decisions needed for the next increment.

Use approved demo data and controlled accounts. Successful automated checks and a screen demonstration are complementary evidence; neither alone proves production readiness for every provider, permission or large upload.

## Evidence and related reading

This map was checked against frontend main `2cc2574` and BFF main `795dd0b` on 10 October 2026. Evidence includes routes, feature components, typed service clients, navigation/configuration and BFF modules. It does not claim a new live test of all the journeys above. The [Phase 1 briefing](yourstorieslive-phase1-stakeholder-demo.html) is a dated delivery presentation; this guide distinguishes feature presence from launch acceptance.

- [Application architecture](application-architecture.md)
- [Stakeholder migration FAQ](stakeholder-migration-faq.md)
- [Media upload limits](media-upload-limits.html)
- [AWS POC record](yourstorieslive-aws-media-poc-record.html)
