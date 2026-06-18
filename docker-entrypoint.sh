#!/bin/sh
set -e

ensure_database() {
  url="$DATABASE_URL"
  db_name="${url##*/}"
  db_name="${db_name%%\?*}"
  admin_url="${url%/*}/postgres"
  if [ -z "$db_name" ] || [ "$db_name" = "postgres" ]; then
    return 0
  fi

  echo "Ensuring database '$db_name' exists..."
  exists="$(psql "$admin_url" -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" 2>/dev/null || true)"
  if [ "$exists" != "1" ]; then
    psql "$admin_url" -c "CREATE DATABASE \"${db_name}\" OWNER adrine;" >/dev/null
    echo "Created database '$db_name'."
  fi
}

if [ -n "$DATABASE_URL" ]; then
  ensure_database
  echo "Applying database schema..."
  npx prisma db push --skip-generate
  if [ "$RUN_DB_SEED" = "true" ]; then
    echo "Seeding database..."
    npx prisma db seed
  fi
fi

exec "$@"
