---
"__PACKAGE_NAME__": patch
---

Add MinIO as a Render web service for production avatar storage.

- New `templates/saas/render/minio/` Dockerfile + entrypoint script wrap the official `minio/minio` image. Container creates the configured bucket on startup (idempotent) and derives `MINIO_SERVER_URL` from `RENDER_EXTERNAL_HOSTNAME` so presigned URLs work on default `.onrender.com` hosts and custom domains alike.
- `render.yaml` gains a MinIO web service block (1 GB persistent disk, starter plan). App service S3 credentials wire from the MinIO service via `fromService`; `S3_ENDPOINT` is hardcoded to `https://__PACKAGE_NAME__-minio.onrender.com` (consumers binding a custom MinIO domain override via dashboard).
- AppConfig: `S3_BUCKET` → `AVATAR_BUCKET` (`s3Bucket` → `avatarBucket`). Connection fields stay under the `s3*` prefix; the bucket field sits flat at the top, named for its use. Future feature buckets (`documentsBucket`, `exportsBucket`) follow the same convention.
- Local dev bucket name harmonised to `avatars` (was `uploads`) for parity with Render.
- README's "Going to production" section documents the storage shape, cost (~$7.25/mo MinIO on Render), and the migration path to Render Object Storage when beta access lands.

Bucket stays fully private; presigning (`@TemporaryLink`) is the access control. No anonymous policy is set on the bucket.
