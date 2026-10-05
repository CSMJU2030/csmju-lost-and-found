#!/bin/sh
set -e

echo "[entrypoint] applying database migrations ..."
npx prisma migrate deploy

echo "[entrypoint] starting Lost & Found (csmju-lost-and-found)"
exec "$@"
