# Deploy Edge Function - Fix CORS Issue

## Problem
CORS error saat memanggil Edge Function `create-user`:
```
Access to fetch at 'https://...supabase.co/functions/v1/create-user' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

## Changes Made

### 1. Remove `user_roles` Table Dependency
Edge Function tidak lagi insert ke table `user_roles` karena field `role` sudah ada di table `users`.

### 2. Update CORS Headers
Tambah headers yang diperlukan untuk browser modern:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, user-agent, referer",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
};
```

## Deploy Steps

### Option 1: Via Supabase CLI (Recommended)

#### 1. Install Supabase CLI
```bash
# Linux/macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

#### 2. Login to Supabase
```bash
supabase login
```

#### 3. Link to Project
```bash
supabase link --project-ref zupygwgwsrcwhkwhuwtk
```

#### 4. Deploy Function
```bash
supabase functions deploy create-user
```

#### 5. Verify Deployment
```bash
supabase functions list
```

### Option 2: Via Supabase Dashboard

#### 1. Buka Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Project: `zupygwgwsrcwhkwhuwtk`
- Menu: Edge Functions

#### 2. Find `create-user` Function
- Klik pada function `create-user`

#### 3. Update Code
- Copy code dari `supabase/functions/create-user/index.ts`
- Paste ke editor di dashboard
- Klik "Deploy"

#### 4. Verify
- Test function dengan curl atau Postman

## Testing After Deploy

### Test 1: OPTIONS Request (CORS Preflight)
```bash
curl -X OPTIONS 'https://zupygwgwsrcwhkwhuwtk.supabase.co/functions/v1/create-user' \
  -H 'Origin: http://localhost:8080' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization, content-type' \
  -v
```

**Expected Response**:
```
< HTTP/2 200
< access-control-allow-origin: *
< access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
< access-control-allow-headers: authorization, x-client-info, apikey, content-type, ...
```

### Test 2: POST Request (Create User)
```bash
curl -X POST 'https://zupygwgwsrcwhkwhuwtk.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "role": "rektor",
    "nip": "123456",
    "jabatan": "Rektor Test"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "rektor"
  },
  "message": "Pengguna berhasil dibuat"
}
```

## Troubleshooting

### Issue 1: "supabase: command not found"
**Solution**: Install Supabase CLI
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Issue 2: "Project not linked"
**Solution**: Link project
```bash
supabase link --project-ref zupygwgwsrcwhkwhuwtk
```

### Issue 3: CORS still blocked after deploy
**Possible causes**:
1. Browser cache - Hard refresh (Ctrl+Shift+R)
2. Function not deployed - Check deployment status
3. Wrong origin - Check if origin matches

**Solutions**:
```bash
# Check function logs
supabase functions logs create-user

# Redeploy
supabase functions deploy create-user --no-verify-jwt
```

### Issue 4: "Missing authorization header"
**Solution**: Make sure to pass JWT token
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch('...', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});
```

## Alternative: Manual User Creation

Jika Edge Function masih bermasalah, gunakan cara manual:

### Via SQL Editor:
```sql
-- Insert user directly
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'rektor@university.ac.id',
  'Prof. Dr. Ir. Budi Santoso, M.Sc.',
  'rektor',
  '197801011998011001',
  'Rektor Universitas',
  NOW(),
  NOW()
);
```

### Via Table Editor:
1. Go to: Table Editor → users → Insert row
2. Fill all fields including `role`
3. Save

## Verification

After deploy, verify:

- [ ] OPTIONS request returns 200 with CORS headers
- [ ] POST request creates user successfully
- [ ] User appears in table `users` with correct role
- [ ] No more CORS errors in browser console
- [ ] Dropdown shows newly created user

## Summary

**Changes**:
1. ✅ Removed `user_roles` table dependency
2. ✅ Updated CORS headers
3. ✅ Simplified user creation logic

**Deploy**:
```bash
supabase functions deploy create-user
```

**Test**:
```bash
# Test CORS
curl -X OPTIONS '.../create-user' -v

# Test create user
curl -X POST '.../create-user' -H 'Authorization: Bearer ...' -d '{...}'
```

**Alternative**: Manual user creation via SQL/Table Editor

---

**File**: `supabase/functions/create-user/index.ts` sudah di-update dan siap di-deploy! 🚀
