#!/usr/bin/env bash
set -euo pipefail

NAME="${1:?Usage: pnpm migration:generate -- <name>}"

CONTAINER="__PACKAGE_NAME__-migration-gen"
PORT=5434
PASSWORD="migration"
DATABASE_URI="postgresql://postgres:${PASSWORD}@localhost:${PORT}/__PACKAGE_NAME__"

cleanup() {
  docker rm -f "$CONTAINER" > /dev/null 2>&1 || true
}

trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" \
  -p "${PORT}:5432" \
  -e "POSTGRES_PASSWORD=${PASSWORD}" \
  -e "POSTGRES_DB=__PACKAGE_NAME__" \
  postgres:17-alpine > /dev/null

docker exec "$CONTAINER" sh -c \
  "until pg_isready -U postgres > /dev/null 2>&1; do sleep 0.2; done"

DATABASE_URI="$DATABASE_URI" pnpm typeorm migration:run -d typeorm/datasource.ts 2>/dev/null || true

DATABASE_URI="$DATABASE_URI" pnpm typeorm migration:generate -d typeorm/datasource.ts "typeorm/migrations/${NAME}"
