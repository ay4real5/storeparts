#!/bin/sh
set -e

# Apply pending migrations before serving. Set RUN_MIGRATIONS=false when
# running several replicas and migrating from a release job instead.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  (cd /opt/migrate && node node_modules/prisma/build/index.js migrate deploy)
fi

exec node server.js
