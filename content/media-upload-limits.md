# Media upload limits

Last reviewed: 27 September 2026

This document records the file-size limits enforced by the YourStoriesLive frontend and the corresponding values sent by the BFF to the legacy media service. The UI formats these binary byte limits with an `MB` label.

| Application area                  | Destination key       | Frontend limit | BFF limit | Contract status                 |
| --------------------------------- | --------------------- | -------------: | --------: | ------------------------------- |
| Photos and media library          | `photo_gallery`       |        200 MiB |   200 MiB | Aligned                         |
| New Story audio and video         | `story`               |        300 MiB |   300 MiB | Aligned                         |
| Your Advice and life-answer media | `user_liking`         |        300 MiB |   300 MiB | Aligned                         |
| Your Reflections                  | `network_data`        |        300 MiB |   300 MiB | Aligned                         |
| Story contributions               | `entity_contribution` |        300 MiB |   300 MiB | Aligned                         |
| Profile photo                     | `user_profile`        |         20 MiB |   200 MiB | Frontend intentionally stricter |
| Contact profile photo             | `contact_photo`       |         20 MiB |   200 MiB | Frontend intentionally stricter |

## Related behavior

- Files are uploaded in 20 MiB chunks by default. This is a transport chunk size, not a total-file limit. `NEXT_PUBLIC_MEDIA_UPLOAD_CHUNK_MB` lowers it where the host caps request bodies (Vercel: 4.5 MB, so it is set to `4` there); values above 20 are capped to 20.
- New Story live recording shows the accumulated size while recording.
- New Story recording automatically stops at approximately 285 MiB, or 95% of its 300 MiB hard limit, to reserve space for the final media chunk and container metadata.
- The completed recording is retained for preview and upload after an automatic stop.
- The marketed two-minute recording duration is not currently enforced by the recorder.

## Source locations

- Frontend destination limits: `src/lib/api/services/media-upload/media-upload.ts`
- BFF legacy upload configuration: `../yourstories-live-api/src/modules/media/legacy/media-upload-legacy.model.ts`
- Story live-recording guard: `src/components/ui/use-media-recorder.ts`

