#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema..."
  npx prisma db push --skip-generate
  if [ "$RUN_DB_SEED" = "true" ]; then
    echo "Seeding database..."
    npx prisma db seed
  fi
fi

exec "$@"
