#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Simple retry loop to wait for DB
MAX_RETRIES=30
COUNT=0
until npx prisma db push --accept-data-loss --skip-generate || [ $COUNT -eq $MAX_RETRIES ]; do
  echo "Database not ready yet, retrying in 2s... ($((COUNT+1))/$MAX_RETRIES)"
  sleep 2
  COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "Error: Database could not be reached after $MAX_RETRIES retries."
  exit 1
fi

echo "Database push successful!"

echo "Seeding database..."
# Run the seed script
# Since we might not have ts-node in the runner, we'll try to use npx
npx prisma db seed

echo "Starting application..."
exec node server.js
