/**
 * Simple script untuk membuat dummy users
 */

import { createClient } from '@supabase/supabase-js';

// Hardcoded untuk testing - GANTI dengan nilai dari .env Anda
const SUPABASE_URL = 'https://zupygwgwsrcwhkwhuwtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cHlnd2d3c3Jjd2hrd2h1d3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjY2MDQsImV4cCI6MjA3OTkwMjYwNH0.UEyLE-HjlFQ-G4ogBAtODrt4gudzz62yxk3AEWyvWcQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dummyUsers = [
  {
    email: 'dekan.teknik@university.ac.id',
    password: 'Password123!',
    name: 'Dr. Ahmad Hidayat, S.T., M.T.',
    nip: '198501012010011001',
    jabatan: 'Dekan Fakultas Teknik',
    role: 'dekan'
  },
  {
    email: 'rektor@university.ac.id',
    password: 'Password123!',
    name: 'Prof. Dr. Ir. Budi Santoso, M.Sc.',
    nip: '197801011998011001',
    jabatan: 'Rektor Universitas',
    role: 'rektor'
  },
  {
    email: 'dekan.ekonomi@university.ac.id',
    password: 'Password123!',
    name: 'Dr. Siti Nurhaliza, S.E., M.M.',
    nip: '198701012012012001',
    jabatan: 'Dekan Fakultas Ekonomi',
    role: 'dekan'
  },
  {
    email: 'warek@university.ac.id',
    password: 'Password123!',
    name: 'Dr. Ir. Eko Prasetyo, M.T.',
    nip: '198001012005011001',
    jabatan: 'Wakil Rektor Bidang Akademik',
    role: 'user'
  }
];

async function createDummyUsers() {
  console.log('🚀 Memulai pembuatan dummy users...\n');
  console.log('⚠️  Note: Script ini menggunakan anon key, jadi hanya bisa signup user baru\n');

  for (const userData of dummyUsers) {
    try {
      console.log(`📝 Membuat user: ${userData.name} (${userData.email})`);

      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            nip: userData.nip,
            jabatan: userData.jabatan
          }
        }
      });

      if (authError) {
        console.log(`   ❌ Error: ${authError.message}\n`);
        continue;
      }

      if (!authData.user) {
        console.log(`   ❌ Error: User data tidak ada\n`);
        continue;
      }

      console.log(`   ✅ Created user`);
      console.log(`   ℹ️  User ID: ${authData.user.id}\n`);

    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  console.log('✅ Selesai!\n');
  console.log('📋 Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  dummyUsers.forEach(user => {
    console.log(`${user.email} | ${user.password}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('⚠️  IMPORTANT: Anda perlu manual assign roles di Supabase Dashboard');
  console.log('1. Go to: Table Editor → user_roles');
  console.log('2. Insert role untuk setiap user yang dibuat\n');
}

createDummyUsers().catch(console.error);
