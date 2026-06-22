#!/bin/sh
set -e

backfill_branch_scope() {
  echo "Backfilling branch scope on legacy rows..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=0 <<'SQL' || true
UPDATE "AdminStaff" SET "branchId" = 'branch_gurgaon' WHERE "branchId" IS NULL OR "branchId" = '';
UPDATE "AdminExpense" SET "branchId" = 'branch_gurgaon' WHERE "branchId" IS NULL;
UPDATE "AdminMrdRequest" SET "branchId" = 'branch_gurgaon' WHERE "branchId" IS NULL;
UPDATE "Patient" SET "tenantId" = 'tenant_navayu', "branchId" = 'branch_gurgaon' WHERE "tenantId" IS NULL OR "branchId" IS NULL;
UPDATE "OpdVisit" SET "tenantId" = 'tenant_navayu', "branchId" = 'branch_gurgaon' WHERE "tenantId" IS NULL OR "branchId" IS NULL;
SQL
}

apply_schema() {
  attempt=1
  while [ "$attempt" -le 5 ]; do
    if npx prisma db push --skip-generate --accept-data-loss; then
      return 0
    fi
    echo "WARNING: prisma db push failed (attempt ${attempt}/5) — retrying in 3s..."
    attempt=$((attempt + 1))
    sleep 3
  done
  echo "WARNING: prisma db push failed after retries — app will start but workspace loads may fail until schema is synced."
  return 1
}

if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema..."
  apply_schema || true
  backfill_branch_scope
  if [ "$RUN_DB_SEED" = "true" ]; then
    echo "Seeding database..."
    npx prisma db seed || echo "Seed skipped or failed (non-fatal)."
  fi
else
  echo "WARNING: DATABASE_URL is not set — skipping database setup."
fi

exec "$@"
