#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

function loadEnvFile() {
  const p = './.env';
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  content.split(/\n/).forEach((line) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const eq = l.indexOf('=');
    if (eq === -1) return;
    const key = l.slice(0, eq);
    let val = l.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnvFile();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : 100;

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || (projectId ? `https://${projectId}.supabase.co` : undefined);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl.replace(/(https?:\/\/)[^@/]+/, '$1<REDACTED>'));
console.log('Using functions host:', projectId ? `${projectId}.functions.supabase.co` : '<unknown>');

try {
  console.log('Fetching candidate documents (status = signed)');
  const listUrl = `${supabaseUrl}/rest/v1/documents?select=id,user_id,status,metadata,file_url&status=eq.signed&limit=${limit}`;
  const listCmd = `curl -s -H "apikey: ${serviceKey}" -H "Authorization: Bearer ${serviceKey}" "${listUrl}"`;
  const out = execSync(listCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const docs = JSON.parse(out || '[]');
  console.log('Found', docs.length, 'documents');

  for (const doc of docs) {
    const docId = doc.id;
    const userId = doc.user_id;
    const metadata = doc.metadata || {};
    const passphrase = metadata?.qr_code || metadata?.dekan_qr_code || metadata?.rektor_qr_code || '';

    console.log('=>', docId, 'user:', userId, 'passphrase length:', passphrase.length);
    if (dryRun) continue;

    const funcHost = projectId ? `https://${projectId}.functions.supabase.co` : `${supabaseUrl.replace('.supabase.co','')}.functions.supabase.co`;
    const funcUrl = `${funcHost}/sign-document`;
    const payload = JSON.stringify({ documentId: docId, signerUserId: userId, passphrase });
    console.log('Invoking sign-document for', docId);
    const invokeCmd = `curl -s -H "Content-Type: application/json" -H "apikey: ${serviceKey}" -H "Authorization: Bearer ${serviceKey}" -d '${payload}' "${funcUrl}"`;
    const resp = execSync(invokeCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log('Result for', docId, ':', resp.slice(0, 1000));
    // small delay
    execSync('sleep 0.2');
  }

  console.log('Batch run complete');
} catch (err) {
  console.error('Batch signer error:', err.message || err);
  process.exit(1);
}
