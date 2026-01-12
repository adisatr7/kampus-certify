# Signing Server Deployment

This service provides server-side PDF signing using `node-signpdf`.

Recommended deployment (production): run as a small Node service (Vercel Serverless, Cloud Run, or Docker on a VM).

Required environment variables (production):
- `SUPABASE_URL` — your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (keep secret)
- `SIGNING_KEY_PRIVATE_PEM` — PEM private key contents or path to mounted secret
- `SIGNING_KEY_CERT_PEM` — PEM certificate contents or path to mounted secret
- `PORT` — optional (default 3001)

Dev notes:
- The repo contains `signing-keys-temp/` with sample PEM files for testing. Do NOT use these in production.
- The Dockerfile copies `signing-keys-temp/` for local testing; for production mount real secrets instead.

Docker (local test):

```bash
# build
docker build -t campus-signing-server -f server/Dockerfile .

# run (use local signing keys only)
docker run -p 3001:3001 --name signing-server campus-signing-server
```

Docker (production, with secrets mounted):

```bash
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your.supabase.url \
  -e SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} \
  -e PORT=3001 \
  -v /secrets/signing-key.pem:/app/signing-keys-temp/signing-key.pem:ro \
  -v /secrets/signing-cert.pem:/app/signing-keys-temp/signing-cert.pem:ro \
  campus-signing-server
```

Kubernetes / Cloud Run / Fargate:
- Provide `SIGNING_KEY_PRIVATE_PEM` and `SIGNING_KEY_CERT_PEM` as secrets and mount into `/app/signing-keys-temp` or set as env vars and modify server to read env.
- Ensure the service account has access to Supabase service role key secure storage.

Security notes:
- Always keep private keys in a secure secret store (Vault, GCP Secret Manager, AWS Secrets Manager).
- Do not expose the signing endpoint publicly without authentication and rate-limiting.
- Prefer allowing only internal network access from your app servers to this signing service.

