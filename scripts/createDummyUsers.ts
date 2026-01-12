/**
 * Script untuk membuat dummy users untuk testing Ijazah dan Sertifikat
 * 
 * Cara menjalankan:
 * 1. Pastikan .env sudah ada dengan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: npx tsx scripts/createDummyUsers.ts
 * 
 * atau dengan bun:
 * bun run scripts/createDummyUsers.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diset di .env');
  console.log('\nTambahkan ke file .env:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('\nAtau gunakan VITE_SUPABASE_SECRET_KEY yang sudah ada');
  process.exit(1);
}

// Create Supabase client with service role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Dummy users data
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

  for (const userData of dummyUsers) {
    try {
      console.log(`📝 Membuat user: ${userData.name} (${userData.email})`);

      // 1. Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          nip: userData.nip,
          jabatan: userData.jabatan
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User sudah ada, skip create auth user`);
          
          // Get existing user
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(u => u.email === userData.email);
          
          if (!existingUser) {
            console.log(`   ❌ Error: User tidak ditemukan`);
            continue;
          }

          // Update public.users
          const { error: updateError } = await supabase
            .from('users')
            .upsert({
              id: existingUser.id,
              name: userData.name,
              email: userData.email,
              nip: userData.nip,
              jabatan: userData.jabatan,
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.log(`   ❌ Error update public.users: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated public.users`);
          }

          // Assign role
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: existingUser.id,
              role: userData.role,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,role'
            });

          if (roleError) {
            console.log(`   ❌ Error assign role: ${roleError.message}`);
          } else {
            console.log(`   ✅ Assigned role: ${userData.role}`);
          }

          console.log(`   ℹ️  User ID: ${existingUser.id}\n`);
          continue;
        }
        
        console.log(`   ❌ Error create auth user: ${authError.message}\n`);
        continue;
      }

      if (!authData.user) {
        console.log(`   ❌ Error: User data tidak ada\n`);
        continue;
      }

      console.log(`   ✅ Created auth user`);
      console.log(`   ℹ️  User ID: ${authData.user.id}`);

      // 2. Insert into public.users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          nip: userData.nip,
          jabatan: userData.jabatan,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (userError) {
        console.log(`   ❌ Error insert public.users: ${userError.message}`);
      } else {
        console.log(`   ✅ Inserted into public.users`);
      }

      // 3. Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: userData.role,
          created_at: new Date().toISOString()
        });

      if (roleError) {
        console.log(`   ❌ Error assign role: ${roleError.message}`);
      } else {
        console.log(`   ✅ Assigned role: ${userData.role}`);
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  console.log('✅ Selesai!\n');
  console.log('📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email                              | Password      | Role');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  dummyUsers.forEach(user => {
    console.log(`${user.email.padEnd(35)} | ${user.password.padEnd(13)} | ${user.role}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verify users
  console.log('🔍 Verifikasi users yang dibuat:\n');
  
  const { data: users, error: verifyError } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      nip,
      jabatan,
      user_roles (role)
    `)
    .in('email', dummyUsers.map(u => u.email));

  if (verifyError) {
    console.error('❌ Error verifikasi:', verifyError.message);
  } else if (users) {
    users.forEach(user => {
      console.log(`✅ ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   NIP: ${user.nip}`);
      console.log(`   Jabatan: ${user.jabatan}`);
      console.log(`   Role: ${(user.user_roles as any)?.[0]?.role || 'N/A'}`);
      console.log(`   ID: ${user.id}\n`);
    });
  }

  console.log('🎉 Dummy users berhasil dibuat!');
  console.log('\n📝 Testing Guide:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1. Testing Ijazah:');
  console.log('   a. Login sebagai: dekan.teknik@university.ac.id');
  console.log('   b. Buat ijazah di /create-ijazah');
  console.log('   c. Pilih rektor: rektor@university.ac.id');
  console.log('   d. Tanda tangani sebagai dekan');
  console.log('   e. Logout dan login sebagai: rektor@university.ac.id');
  console.log('   f. Tanda tangani sebagai rektor');
  console.log('   g. Verify dokumen muncul di kedua dashboard dengan status "signed"');
  console.log('\n2. Testing Sertifikat:');
  console.log('   a. Login sebagai: dekan.ekonomi@university.ac.id');
  console.log('   b. Buat sertifikat di /create-sertifikat');
  console.log('   c. Pilih penandatangan 1: dekan.ekonomi@university.ac.id');
  console.log('   d. Pilih penandatangan 2: warek@university.ac.id');
  console.log('   e. Tanda tangani sebagai penandatangan 1');
  console.log('   f. Logout dan login sebagai: warek@university.ac.id');
  console.log('   g. Tanda tangani sebagai penandatangan 2');
  console.log('   h. Verify dokumen muncul dengan status "signed"');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the script
createDummyUsers().catch(console.error);
