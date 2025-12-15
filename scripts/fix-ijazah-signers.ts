import { createClient } from '@supabase/supabase-js';

// This script fixes existing ijazah records to populate dekan_id and rektor_id
// Run this script to fix signature placeholder issues

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixIjazahSigners() {
  console.log('🔧 Starting to fix ijazah signers...');

  try {
    // First, get all ijazah records that need fixing
    const { data: ijazahRecords, error: fetchError } = await supabase
      .from('ijazah')
      .select(`
        id,
        nama_mahasiswa,
        dekan_id,
        rektor_id,
        document_id,
        documents!inner(
          id,
          user_id,
          metadata
        )
      `)
      .or('dekan_id.is.null,rektor_id.is.null');

    if (fetchError) {
      console.error('❌ Error fetching ijazah records:', fetchError);
      return;
    }

    console.log(`📋 Found ${ijazahRecords.length} ijazah records to fix`);

    let fixedCount = 0;

    for (const ijazah of ijazahRecords) {
      const document = ijazah.documents;
      const metadata = document.metadata as any || {};

      const dekanId = ijazah.dekan_id || 
                     metadata.dekan_id || 
                     metadata.created_by_id || 
                     document.user_id;

      const rektorId = ijazah.rektor_id || metadata.rektor_id;

      if (dekanId || rektorId) {
        const updateData: any = {};
        if (!ijazah.dekan_id && dekanId) updateData.dekan_id = dekanId;
        if (!ijazah.rektor_id && rektorId) updateData.rektor_id = rektorId;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('ijazah')
            .update(updateData)
            .eq('id', ijazah.id);

          if (updateError) {
            console.error(`❌ Error updating ijazah ${ijazah.id}:`, updateError);
          } else {
            console.log(`✅ Fixed ijazah for ${ijazah.nama_mahasiswa} - dekan: ${updateData.dekan_id ? '✓' : '✗'}, rektor: ${updateData.rektor_id ? '✓' : '✗'}`);
            fixedCount++;
          }
        }
      }
    }

    console.log(`🎉 Fixed ${fixedCount} ijazah records`);

    // Verify the fix by checking some records
    console.log('\n🔍 Verifying fixes...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('ijazah')
      .select(`
        id,
        nama_mahasiswa,
        dekan_id,
        rektor_id,
        users!ijazah_dekan_id_fkey(name),
        users!ijazah_rektor_id_fkey(name)
      `)
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      console.log('📊 Sample of fixed records:');
      verifyData.forEach((record: any) => {
        console.log(`  - ${record.nama_mahasiswa}: Dekan=${record.users?.name || 'NULL'}, Rektor=${record.users?.name || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixIjazahSigners().then(() => {
  console.log('✨ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});