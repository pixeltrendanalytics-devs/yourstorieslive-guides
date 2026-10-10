# Media transcription: current limitation

Last updated: 3 October 2026

## Current behaviour

New audio and video uploaded from Stories, live timeline recording, Advice,
Reflections, and story contributions are stored through the new BFF media
library in private S3. The frontend does **not** send those AWS object paths to
the legacy PHP upload or transcription endpoints.

Automatic transcription is therefore not available yet for new AWS media. The
transcript editor remains usable, but starts empty and the member must enter or
paste text manually. This does not lose the recording: the original media is
stored in S3 and its RDS asset/relationship records are retained normally.

## Why

The existing transcriber is coupled to PHP-managed paths and files. A private
S3 object identified by the new media asset UUID is outside that contract.
Calling the old endpoint would either fail or create a second, conflicting copy
of the media.

## Required follow-up

Add an asynchronous BFF-owned pipeline:

1. Mark an audio/video asset `transcription_pending` after upload completion.
2. Publish a job containing only the media UUID and owner context.
3. Let a worker read the private S3 object with an IAM role and call the chosen
   transcription provider (for AWS, Amazon Transcribe is the natural first
   option).
4. Store transcript text, language, provider/job identifier, timestamps, and
   `ready` or `failed` status in RDS.
5. Expose status and transcript through `/api/v1/media-library/**`; allow retry
   without re-uploading the recording.
6. Keep manual edits distinct from machine text so a later job cannot overwrite
   a member's correction.

Until that pipeline exists, tests and product acceptance must expect an empty
editable transcript for new recordings, not legacy automatic transcription.

