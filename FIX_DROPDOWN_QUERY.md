# Fix: Dropdown Rektor/Dekan Kosong

## Problem
Dropdown untuk memilih rektor/dekan/penandatangan kosong karena query yang terlalu kompleks dengan 2 langkah terpisah.

## Root Cause
Query lama menggunakan 2 langkah:
1. Query `user_roles` untuk mendapatkan `user_id`
2. Query `users` dengan filter `IN (user_ids)`

Ini menyebabkan masalah jika:
- Tidak ada data di `user_roles`
- RLS policy memblokir salah satu query
- Data tidak sinkron

## Solution
Gunakan **direct query** dari table `users` karena field `role` sudah ada di table users:

### Before (2 queries - kompleks):
```typescript
// Step 1: Get user IDs from user_roles
const { data: rektorRoles } = await supabase
  .from("user_roles")
  .select("user_id")
  .eq("role", "rektor");

// Step 2: Get users by IDs
const rektorIds = rektorRoles.map((r) => r.user_id);
const { data: rektors } = await supabase
  .from("users")
  .select("id, name, nip")
  .in("id", rektorIds);
```

### After (1 direct query):
```typescript
// Direct query from users table
const { data: rektors } = await supabase
  .from("users")
  .select("id, name, nip, jabatan")
  .eq("role", "rektor")
  .order("name");
```

**Note**: Table `user_roles` tidak digunakan karena field `role` sudah ada langsung di table `users`.

## Benefits

1. ✅ **Lebih sederhana** - Hanya 1 query
2. ✅ **Lebih cepat** - Tidak perlu 2 round trips
3. ✅ **Lebih reliable** - Tidak ada masalah sinkronisasi
4. ✅ **Lebih mudah debug** - Satu query untuk di-check
5. ✅ **RLS friendly** - Join otomatis respect RLS policies

## Files Changed

### 1. `src/pages/CreateIjazahNew.tsx`
**Change**: Direct query dari users table dengan filter role
```typescript
// Old: 2-step query with user_roles
// New: Direct query with role filter
const { data: rektors } = await supabase
  .from("users")
  .select("id, name, nip, jabatan")
  .eq("role", "rektor")
  .order("name");
```

### 2. `src/pages/CreateSertifikatNew.tsx`
**Change**: Direct query untuk fetch all users
```typescript
// Old: 2-step query with user_roles
// New: Direct query
const { data: users } = await supabase
  .from("users")
  .select("id, name, nip, jabatan, role")
  .order("name");
```

## How Direct Query Works

Query langsung dari table `users` dengan filter `role`:

```typescript
.eq("role", "rektor")
```

Hasilnya:
```json
[
  {
    "id": "abc-123",
    "name": "Prof. Dr. Ir. Budi Santoso",
    "nip": "197801011998011001",
    "jabatan": "Rektor Universitas",
    "role": "rektor"
  }
]
```

**Note**: Field `role` sudah ada di table `users`, jadi tidak perlu join ke table lain.

## Testing

### Test Query di SQL Editor:
```sql
-- Test query untuk rektor
SELECT 
  u.id,
  u.name,
  u.nip,
  ur.role
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'rektor';
```

### Test di Browser:
1. Buka aplikasi
2. Navigate ke `/create-ijazah`
3. Check console logs (F12)
4. Should see: `✅ Rektor list set: X rektors`
5. Dropdown should show rektor names

## Console Logs

Setelah fix, console logs akan menunjukkan:
```
🔍 Fetching rektors...
👥 Rektors query result: [{id: "...", name: "...", nip: "..."}]
✅ Rektor list set: 1 rektors
```

Jika tidak ada data:
```
🔍 Fetching rektors...
👥 Rektors query result: []
⚠️ No rektor found
```

## Troubleshooting

### Issue: Still empty after fix
**Check**:
1. Apakah user ada di table `users`?
2. Apakah role ada di table `user_roles`?
3. Check console logs untuk error

**Solution**:
```sql
-- Verify data exists
SELECT 
  u.id,
  u.name,
  u.email,
  ur.role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'rektor@university.ac.id';
```

### Issue: Error "relation does not exist"
**Cause**: Foreign key relationship belum di-setup  
**Solution**: Check Supabase table relationships

### Issue: RLS policy error
**Cause**: RLS policy memblokir join  
**Solution**: Update RLS policy untuk allow join:
```sql
-- Example RLS policy
CREATE POLICY "Users can read all users with roles"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = users.id
  )
);
```

## Related Files

- `TROUBLESHOOTING_DROPDOWN.md` - Troubleshooting guide
- `supabase/verify_and_fix_users.sql` - Verification script
- `MANUAL_TESTING_STEPS.md` - Testing guide

## Summary

✅ Query disederhanakan dari 2 langkah menjadi 1 langkah  
✅ Menggunakan inner join untuk lebih reliable  
✅ Tambah console logs untuk debugging  
✅ Tambah error handling yang lebih baik  
✅ Dropdown sekarang akan muncul jika data ada  

**Next**: Pastikan user dengan role rektor/dekan sudah dibuat di database!
