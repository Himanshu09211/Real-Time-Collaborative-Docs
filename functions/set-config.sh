#!/bin/bash
# Deploy Firebase Functions config
# Usage: ./set-config.sh

echo "Setting Firebase Functions config..."

firebase functions:config:set \
  "gemini.api_key=$GEMINI_API_KEY" \
  "gemini.model=$GEMINI_MODEL" \
  "supabase.url=$SUPABASE_URL" \
  "supabase.service_key=$SUPABASE_SERVICE_KEY"

echo "Done! Deploy functions with: firebase deploy --only functions"