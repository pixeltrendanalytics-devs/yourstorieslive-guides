# Application API reference

Reviewed: 26 October 2026 · For product, frontend and backend readers

This guide explains the APIs exposed by the NestJS BFF: what each route does, which information it needs and what it returns. The catalogue below is grouped by application feature and can be searched by name, method, field or URL path.

This is a reading reference. It does not connect to an API server, accept credentials or execute requests. Availability in a particular environment still depends on its configuration, selected implementation and upstream services.

## How an API call works

```text
Member action in Next.js
    → typed request to the BFF
    → authentication/context and DTO validation
    → feature operation, usually through a PHP compatibility adapter
    → mapped response or error
    → the interface displays the result
```

The URLs here are the BFF routes the frontend uses. PHP module/step names, internal database tables and parity-test details are deliberately outside this reference. Most paths begin with `/api/v1`; the social sign-in entries also list their older callback aliases.

| Part | Meaning |
| --- | --- |
| Base URL | The BFF origin configured for the selected environment. Examples use `https://api.example.invalid`, not a live service. |
| Method | `GET` retrieves data; `POST` performs an action or creation; `PATCH`/`PUT` update state; `DELETE` removes or hides something. Read the route notes for its actual effect. |
| Path fields | Replace a segment such as `:contactId` with the permitted record identifier. Treat IDs as opaque strings; do not assume all are UUIDs. |
| Query fields | Values after `?`, used for search, filters and other route options. Use the exact names declared on that endpoint. |
| JSON body | Fields sent in the request body, usually with `Content-Type: application/json`. Upload bytes use a different content type. |
| Member session | Normal protected requests use `Authorization: Bearer <access-token>`. Being signed in does not grant access to every user or record. |
| Public entry point | No existing member bearer token is required. A password, OTP, invitation credential or provider code/state may still be required. |

**Required versus optional:** the input labels come from the request DTOs, including inherited fields. Backend business rules and conditional field combinations can impose additional requirements described in the operation notes. An optional field is not automatically safe to clear; profile/contact updates can preserve legacy replacement semantics.

The catalogue lists declared response fields as a guide to reading `data`. It is not a complete schema explorer or a guarantee that upstream optional fields will always be populated.

## Responses and common failures

Most successful calls return a JSON envelope:

```json
{
  "success": true,
  "data": { "id": "1234" },
  "meta": { "requestId": "00000000-0000-4000-8000-000000000001" }
}
```

The payload may be a record, a list, counts or an acknowledgement. Some paginated endpoints additionally return `meta.pagination`; paging inputs differ by route. For example, the timeline accepts `page`/`pageSize`, notifications accept `page`, and some life-story routes use a limit. Do not invent a universal cursor parameter for every list.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "code": "INVALID_REQUEST", "message": "email must be an email" }
    ]
  },
  "meta": { "requestId": "00000000-0000-4000-8000-000000000001" }
}
```

These are illustrative shapes, not captured production responses. Field-detail codes depend on the actual validator/error mapping. Keep the request ID when reporting an issue, without including tokens, passwords or personal content.

| HTTP result | How to interpret it |
| --- | --- |
| `200` / `201` | Success status depends on the route; its payload still needs to be read. |
| `202` | Accepted for processing. It does not by itself prove that an invitation or other downstream delivery is complete. |
| `204` | Successful operation with no response body; do not parse it as JSON. |
| `302` | Browser redirect used by OAuth/consent flows, rather than a normal JSON API result. |
| `400` / `422` | Invalid request or field validation. Correct the input before retrying. |
| `401` | The session is missing, invalid or expired. Use the established sign-in/refresh flow. |
| `403` / `404` | Permission denied or a record not found/available to this caller. |
| `501` | The chosen operation/provider is not implemented or configured in that environment. |
| `5xx` | Server/upstream failure or timeout. Check the request ID; do not blindly repeat writes, invitations or approvals. |

The BFF maps failed PHP business responses into its error contract. A method’s documented success status is not an exhaustive list of its errors. Many delete routes in this snapshot return `200` with an acknowledgement; do not assume they all return `204`.

## Three workflows to follow

### Sign in and load the member

1. `POST /api/v1/auth/sign-in` sends `email` and `password`.
2. Read the result: it may contain session credentials **or** a two-factor challenge. If challenged, follow the OTP send/resend/verify routes with the challenge context.
3. Use the access token on `GET /api/v1/me` and protected feature requests.
4. `POST /api/v1/auth/token/refresh` uses the refresh credential. It does not make an expired upstream PHP session valid indefinitely.

### Create a written story

`POST /api/v1/entities` accepts a story. A small illustrative request is:

```json
{
  "title": "A Sunday by the sea",
  "occurred": { "lifeStage": "30s", "on": "2020-06-15", "precision": "exact_day" },
  "bodyHtml": "<p>A family memory worth keeping.</p>",
  "location": "Singapore",
  "accessLevel": "private"
}
```

Its declared result is a story reference with an `id`, inside the success envelope. Use the returned identifier to fetch the story or locate it on `GET /api/v1/timeline`. Upload attachments first; story creation references uploaded media rather than carrying raw bytes. UI-required fields can be stricter than the minimal DTO contract.

### Upload, organize and share a photo

1. Upload raw bytes to `POST /api/v1/media-assets/uploads`, with `destination` and `fileName` in the query string. A large file is sent as chunks; compile those parts with `POST /api/v1/media-assets/uploads/compile` using the **server-returned** chunk names.
2. Create/register the gallery item through the relevant media operation, then read its detail or content. Uploading bytes and saving a story/gallery relationship are different steps.
3. Find appropriate targets through assignment-candidate routes. Adding a photo to a contact and sharing it with another account have different effects; contacts have a 10-photo cap in the UI workflow.
4. Send a sharing request with `POST /api/v1/media-shares` and `operation: "share"`. The receiver reads `/api/v1/media-shares/inbox` and uses the request ID plus the declared decision inputs to approve or deny it. The outbox lists requests made for other people’s media; it is not a general history of every photo offered to someone else.
5. Before deletion, read `GET /api/v1/media-assets/deletion-impact`; confirm the affected links, then call `DELETE /api/v1/media-assets` with the declared JSON body. A missing thumbnail alone does not prove durable deletion.

Provider consent/callback routes return redirects or popup HTML. They do not themselves prove the selected media has been saved into the member’s library. Transcription is also a separate request after upload. See the dated [upload limits reference](media-upload-limits.html) for the recorded caps, and confirm environment body limits before large transfers.

## Browse the API catalogue

<!-- API_CATALOGUE -->

## Scope and maintenance

<!-- API_SNAPSHOT -->

The catalogue includes the application controller routes, including browser callbacks omitted from Swagger’s “try it out” surface. It excludes development tracing/debug routes, framework endpoints such as Next.js `/_next/image`, third-party APIs called directly by the browser, PHP’s internal RPC catalogue and the separate AWS POC routes. Gifts, billing and concierge screens do not imply additional implemented BFF APIs beyond the routes actually listed.

The snapshot is generated from controller decorators, imported request DTOs and response view models. It records route contracts; it does not run the application, call PHP, assess parity or certify permissions. When the BFF changes, refresh and review the snapshot before publishing it again. Conditional validation and business rules remain important even where a field table is concise.

- [Application architecture](application-architecture.md)
- [Features and member workflows](application-features.md)
- [Stakeholder migration FAQ](stakeholder-migration-faq.md)
