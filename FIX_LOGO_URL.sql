-- Fix logo_url yang menggunakan external URL (CORS issue)

-- 1. Check ijazah dengan external logo URL
SELECT 
  id,
  document_id,
  nama_mahasiswa,
  logo_url
FROM ijazah
WHERE logo_url LIKE 'http%'
  AND logo_url NOT LIKE '%supabase%';

-- 2. Update semua ijazah dengan external URL ke local logo
UPDATE ijazah
SET logo_url = '/logo-umc.svg'
WHERE logo_url LIKE 'http%'
  AND logo_url NOT LIKE '%supabase%';

-- 3. Verify update
SELECT 
  id,
  document_id,
  nama_mahasiswa,
  logo_url
FROM ijazah
ORDER BY created_at DESC
LIMIT 10;

-- 4. Jika ingin update specific ijazah
-- UPDATE ijazah
-- SET logo_url = '/logo-umc.svg'
-- WHERE document_id = 'DOCUMENT_ID';
