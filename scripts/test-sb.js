import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env','utf8');
env.split(/\n/).forEach((l)=>{const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i); let v=t.slice(i+1); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); process.env[k]=v;});

const SUPABASE_URL = process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.VITE_SUPABASE_SECRET_KEY;
console.log('URL=',SUPABASE_URL);
console.log('KEYLEN=', KEY? KEY.length : 'MISSING');

const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

(async ()=>{
  try {
    const res = await supabase.from('documents').select('id').limit(1);
    console.log('RES',res);
  } catch(e) {
    console.error('ERR2', e);
  }
})();
