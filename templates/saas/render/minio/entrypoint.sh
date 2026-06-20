#!/bin/sh
set -e

# Render injects RENDER_EXTERNAL_HOSTNAME at runtime — use it for URL signing.
# Updates automatically when consumers bind a custom domain.
export MINIO_SERVER_URL="https://${RENDER_EXTERNAL_HOSTNAME}"

# Start minio in the background
minio server /data --address "${HOST}:${PORT}" --console-address "${HOST}:${CONSOLE_PORT}" &
MINIO_PID=$!

# Wait for minio to accept connections
until curl -sf "http://${HOST}:${PORT}/minio/health/live" >/dev/null; do
  sleep 1
done

# Create the configured bucket if missing. Bucket stays private — presigning is the
# access control (saas-template uses @TemporaryLink). No anonymous policy is set.
mc alias set local "http://${HOST}:${PORT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"
mc mb --ignore-existing "local/${AVATAR_BUCKET:-avatars}"

# Hand foreground back to minio so the container's lifecycle tracks it
wait "$MINIO_PID"
