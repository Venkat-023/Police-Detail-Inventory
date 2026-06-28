#!/bin/sh
set -e

echo "==> Pushing database schema..."
npx prisma db push --skip-generate

echo "==> Seeding database..."
npx tsx prisma/seed.ts

echo "==> Starting backend dev server..."
exec npx tsx watch src/server.ts
