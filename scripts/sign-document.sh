#!/bin/bash

# Quick document signing script
# Usage: ./sign-document.sh <documentId> [signerName]

DOCUMENT_ID="$1"
SIGNER_NAME="${2:-System Signer}"
SUPABASE_URL="${PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$DOCUMENT_ID" ]; then
  echo "❌ Usage: ./sign-document.sh <documentId> [signerName]"
  echo "   Example: ./sign-document.sh 550e8400-e29b-41d4-a716-446655440000"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables"
  exit 1
fi

echo ""
echo "🔐 Signing document: $DOCUMENT_ID"
echo "📝 Signer: $SIGNER_NAME"
echo ""

# Call the sign-document edge function
echo "🚀 Invoking sign-document function..."
RESPONSE=$(curl -X POST \
  "${SUPABASE_URL}/functions/v1/sign-document" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"documentId\": \"${DOCUMENT_ID}\", \"signerName\": \"${SIGNER_NAME}\"}" \
  2>/dev/null)

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Extract file URL if present
FILE_URL=$(echo "$RESPONSE" | jq -r '.fileUrl // empty' 2>/dev/null)

if [ -n "$FILE_URL" ]; then
  echo ""
  echo "✅ Document signed successfully!"
  echo "📥 Signed PDF:"
  echo "   $FILE_URL"
  echo ""
else
  echo ""
  echo "⚠️ Check the response above for details"
  echo ""
fi
