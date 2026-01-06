# 🔐 URGENT FIX: Set MASTER_KEY_B64 in Vercel

## The Problem
Vercel deployment is showing "Signed By: Kampus Certify" because **MASTER_KEY_B64 is not set in Vercel environment**.

From the logs:
```
2026-01-05 23:10:29.082 [error] ❌ Failed to decrypt private key: The operation failed for an operation-specific reason
2026-01-05 23:10:29.082 [warning] Vercel sign: failed to fetch per-user signing key, falling back to server key
```

What's happening:
1. ✅ Code fetches correct certificate from database (CN=test dekan)
2. ❌ Tries to decrypt encrypted private key with MASTER_KEY_B64
3. ❌ MASTER_KEY_B64 is missing in Vercel → decryption fails
4. 💥 Falls back to dev certificate (CN=Kampus Certify)
5. 📄 Signs PDF with wrong certificate → "Signed By" shows "Kampus Certify"

## ✅ Solution: Set MASTER_KEY_B64 in Vercel

### Step 1: Get the MASTER_KEY_B64 value
Already have it locally:
```
MASTER_KEY_B64=wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8=
```

### Step 2: Set it in Vercel Environment Variables

**Option A: Using Vercel CLI (Recommended)**
```bash
# Set in production
vercel env add MASTER_KEY_B64
# When prompted, paste: wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8=

# Or set directly:
vercel env add MASTER_KEY_B64 wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8= --environment production
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select project: kampus-certify
3. Go to Settings → Environment Variables
4. Add new variable:
   - Name: `MASTER_KEY_B64`
   - Value: `wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8=`
   - Select: Production, Preview, Development (all environments)
5. Click "Save"

**Option C: Using .env.production file (if you have one)**
```
MASTER_KEY_B64=wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8=
```

### Step 3: Redeploy to Vercel
```bash
# After setting the environment variable, redeploy
vercel --prod

# Or force redeploy:
vercel --prod --force
```

### Step 4: Verify the Fix
1. Check Vercel logs for successful decryption:
   ```
   ✅ Private key decrypted successfully
   ```
2. Sign a document again
3. Check "Signed By" field - should show actual user name, NOT "Kampus Certify"

## 🔍 How to Verify Environment Variable is Set

```bash
# Check if variable is set in Vercel
vercel env list

# Output should show:
# MASTER_KEY_B64 (production)
```

## 🚨 Important Security Notes

⚠️ **DO NOT**:
- Share MASTER_KEY_B64 in public repos or chat
- Hardcode it in code files
- Use different keys for different environments (must be same key!)

✅ **DO**:
- Keep it secret in environment variables only
- Use same key in:
  - Vercel: `MASTER_KEY_B64`
  - Supabase Edge Functions: `MASTER_KEY_B64` secret
  - Local `.env` file (already set)
- Treat it like a password/secret

## 🧪 Testing After Fix

1. **Test locally first** (to confirm it works):
   ```bash
   npm run dev
   # Sign a document locally
   # Check "Signed By" shows correct name
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Test on Vercel**:
   - Sign document on deployed app
   - Download PDF
   - Open in Adobe Acrobat
   - Check "Signed By" field

4. **Expected Result**:
   ```
   ✅ Local: "Signed By: test dekan" or actual user name
   ✅ Vercel: "Signed By: test dekan" or actual user name (SAME as local)
   ❌ Before fix: "Signed By: Kampus Certify"
   ```

## 📋 Troubleshooting

### Still seeing "Kampus Certify"?

1. **Verify environment variable is set**:
   ```bash
   vercel env list
   # Must show MASTER_KEY_B64
   ```

2. **Check logs for decryption status**:
   - Go to Vercel dashboard → your deployment
   - Check function logs
   - Should show: `✅ Private key decrypted successfully`
   - If shows error, check MASTER_KEY_B64 value

3. **Verify same key is used everywhere**:
   - Local `.env`: MASTER_KEY_B64=...
   - Vercel env var: MASTER_KEY_B64=...
   - These MUST be identical!

4. **Force redeploy after setting env var**:
   ```bash
   vercel --prod --force
   ```

## 📊 Expected Log Output After Fix

```
2026-01-05 23:10:29.069 [info] Certificate Subject: CN=test dekan, ...
2026-01-05 23:10:29.082 [info] 🔓 Decrypting private key...
2026-01-05 23:10:29.082 [info] ✅ Private key decrypted successfully  ← THIS SHOULD APPEAR
2026-01-05 23:10:29.088 [info] Certificate Subject CN: test dekan  ← CORRECT NAME!
```

## 🎯 Quick Checklist

- [ ] Have MASTER_KEY_B64 value: `wO80DxjEuwQ+1atJtJE3EOY78dCErfrLDfT8wAjMyc8=`
- [ ] Set MASTER_KEY_B64 in Vercel environment variables
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Wait for deployment to complete
- [ ] Test signing on Vercel deployment
- [ ] Verify "Signed By" shows correct user name
- [ ] Check logs show successful decryption

---

**After completing these steps, the "Signed By" field should display the actual signer's name, not "Kampus Certify"!**
