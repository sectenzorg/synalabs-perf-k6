#!/bin/sh
set -e

echo "🚀 Starting Synalabs Perf Entrypoint..."

# Simple retry loop to wait for DB
MAX_RETRIES=30
COUNT=0
echo "⏳ Waiting for database to be ready..."
until npx prisma db push --accept-data-loss --skip-generate || [ $COUNT -eq $MAX_RETRIES ]; do
  echo "⚠️ Database not ready yet, retrying in 2s... ($((COUNT+1))/$MAX_RETRIES)"
  sleep 2
  COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Error: Database could not be reached after $MAX_RETRIES retries."
  exit 1
fi

echo "✅ Database push successful!"

echo "🌱 Seeding database..."
# Run the seed script directly with ts-node since we installed it in runner
if npx ts-node prisma/seed.ts; then
  echo "✅ Seeding finished successfully."
else
  echo "❌ Seeding failed! Check the logs above."
  # We don't exit 1 here to allow the app to start even if seed fails (maybe data already exists)
fi

echo "🚀 Starting application..."
exec node server.js
