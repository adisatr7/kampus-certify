#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env or .env.local into process.env if present
function loadDotEnvFiles() {
  const candidates = ['.env', '.env.local', '.env.development'];
  for (const name of candidates) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split(/\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        // Remove surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
      console.log(`Loaded env from ${name}`);
      break;
    }
  }
}

loadDotEnvFiles();

async function main() {
  // Support multiple env variable names stored in .env
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || (process.env.VITE_SUPABASE_PROJECT_ID ? `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined);
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
  }

  console.log('Using SUPABASE_URL=', SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY present=', !!SUPABASE_SERVICE_ROLE_KEY);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArgIndex = args.findIndex(a => a === '--limit');
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 100;

  console.log('Batch signer starting', { dryRun, limit });

  // Fetch candidate documents: status = 'signed' OR workflow completed
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select('id,user_id,status,metadata,file_url')
    .in('status', ['signed'])
    .limit(limit);

  if (docsErr) {
    console.error('Failed to fetch documents:', docsErr);
    process.exit(1);
  }

  console.log('Found documents to check:', docs.length);

  for (const doc of docs) {
    try {
      const docId = doc.id;
      const userId = doc.user_id;

      // Check if document already has a signature record
      const { data: sig, error: sigErr } = await supabase
        .from('document_signatures')
        .select('id')
        .eq('document_id', docId)
        .limit(1)
        .maybeSingle();

      if (sigErr) {
        console.warn('Could not check signature for', docId, sigErr);
        continue;
      }

      if (sig) {
        console.log(`Skipping ${docId} — signature exists (${sig.id})`);
        continue;
      }

      console.log(`Will sign document ${docId} (user ${userId})`);

      if (dryRun) continue;

      // Derive passphrase from metadata if available
      const metadata = doc.metadata || {};
      const passphrase = metadata?.qr_code || metadata?.dekan_qr_code || metadata?.rektor_qr_code || '';

      console.log('Invoking sign-document for', docId);
      const { data: signResult, error: signError } = await supabase.functions.invoke('sign-document', {
        body: { documentId: docId, signerUserId: userId, passphrase },
      });

      if (signError) {
        console.error('sign-document error for', docId, signError);
      } else {
        console.log('sign-document result for', docId, signResult?.message || signResult);
      }

      // Rate-limit a bit to avoid overwhelming functions
      await new Promise((res) => setTimeout(res, 500));
    } catch (err) {
      console.error('Error processing document:', err);
    }
  }

  console.log('Batch signer finished');
}

main().catch((err) => {
  console.error('Batch signer failed:', err);
  process.exit(1);
});
